"""Publish only the reviewed home-lab files with an isolated Git index."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import uuid
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'outputs/gamehub-home-prd-20261105'
PRD = ROOT / 'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求'
MD = PRD / '【PRD】《盖世游戏》7.0首页改版需求.md'
RECORD = HERE / 'publication-r10.json'
BRANCH = 'codex/gamehub-home-r10-20261106'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(*args, env=None, data=None):
    p = subprocess.run(['git', '-c', 'http.version=HTTP/1.1', *args], cwd=ROOT,
                       env=env, input=data, capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf-8', errors='replace'))
    return p.stdout

def snapshot():
    index = Path(git('rev-parse', '--git-path', 'index').decode().strip())
    if not index.is_absolute():
        index = ROOT / index
    return git('rev-parse', 'HEAD').strip(), sha(index.read_bytes())

def commit_files(base, paths, message):
    before = snapshot()
    temporary = HERE / ('.publish-r10-' + uuid.uuid4().hex + '.index')
    env = dict(os.environ, GIT_INDEX_FILE=str(temporary))
    try:
        git('read-tree', base, env=env)
        for path in sorted(set(paths)):
            assert path.is_file(), path
            relative = path.relative_to(ROOT).as_posix()
            blob = git('hash-object', '-w', '--stdin', data=path.read_bytes()).decode().strip()
            git('update-index', '--add', '--cacheinfo', f'100644,{blob},{relative}', env=env)
        tree = git('write-tree', env=env).decode().strip()
        changed = git('-c', 'core.quotepath=false', 'diff-tree', '--no-commit-id', '--name-only', '-r', base, tree).decode().splitlines()
        assert changed
        assert set(changed) <= {p.relative_to(ROOT).as_posix() for p in paths}
        commit = git('commit-tree', tree, '-p', base, '-m', message).decode().strip()
        assert snapshot() == before, 'Shared HEAD/index changed; do not overwrite it'
        return commit, changed
    finally:
        temporary.unlink(missing_ok=True)

def check_assets():
    digest = sha((ROOT / 'public/gamehub-home-lab/index.html').read_bytes())
    for file, key in [('verification.json', 'artifactSha256'), ('tasks-evidence/verification.json', 'htmlSha256'), ('monthly-evidence/verification.json', 'htmlSha256')]:
        d = json.loads((HERE / file).read_text('utf-8'))
        assert d['status'] == 'passed' and d[key] == digest, file
    return digest

def assets():
    digest = check_assets()
    names = ['app.js', 'tasks-revision.js', 'tasks-revision.css', 'build.py', 'build-manifest.json',
             'tasks-verify.cjs', 'verify-monthly.cjs', 'verify.cjs', 'verification.json',
             'tasks-evidence/verification.json', 'monthly-evidence/verification.json', 'publish-r10.py']
    paths = [HERE / name for name in names] + [ROOT / 'public/gamehub-home-lab/index.html']
    paths += list((HERE / 'monthly-evidence').glob('*.png'))
    paths += list((HERE / 'tasks-evidence').glob('*.png'))
    # Include only reader figures, never render scratch files or unrelated output.
    source = (OUT / 'prd-v1.4-source.md').read_text('utf-8')
    for name in re.findall(r'!\[[^\]]*\]\(__BASE__/([^\)]+)\)', source):
        paths.append(OUT / name)
    git('fetch', 'origin', 'refs/heads/master:refs/remotes/origin/master')
    base = git('rev-parse', 'refs/remotes/origin/master').decode().strip()
    prior = json.loads((HERE / 'publication-r9.json').read_text('utf-8'))['commit']
    conflicts = git('diff', '--name-only', prior, base, '--', *[p.relative_to(ROOT).as_posix() for p in paths]).decode().strip()
    if conflicts:
        raise RuntimeError('Remote scope changed since r9; review first: ' + conflicts)
    commit, changed = commit_files(base, paths, 'fix(gamehub): show current sign-in week with expandable month and inline tasks')
    before = snapshot()
    git('update-ref', 'refs/heads/' + BRANCH, commit)
    git('push', '--atomic', 'origin', commit + ':refs/heads/master', commit + ':refs/heads/' + BRANCH)
    assert git('ls-remote', 'origin', 'refs/heads/master').decode().split()[0] == commit
    assert snapshot() == before
    record = {'version': 'r10', 'assetCommit': commit, 'base': base, 'branch': BRANCH,
              'url': 'https://z36358631-ship-it.github.io/-/public/gamehub-home-lab/',
              'sha256': digest, 'assetFiles': changed, 'assetPush': 'passed', 'docsPush': 'pending',
              'headPreserved': True, 'indexPreserved': True}
    RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps(record, ensure_ascii=False))

def images():
    record = json.loads(RECORD.read_text('utf-8'))
    source = (OUT / 'prd-v1.4-source.md').read_text('utf-8')
    destination = ROOT / 'public/prd/gamehub-home-r10-20261106'
    destination.mkdir(parents=True, exist_ok=True)
    paths = [HERE / 'publish-r10.py']
    for name in re.findall(r'!\[[^\]]*\]\(__BASE__/([^\)]+)\)', source):
        target = destination / name
        shutil.copyfile(OUT / name, target)
        paths.append(target)
    git('fetch', 'origin', 'refs/heads/master:refs/remotes/origin/master')
    base = git('rev-parse', 'refs/remotes/origin/master').decode().strip()
    assert base == record['assetCommit'], 'Review remote changes before publishing images'
    commit, changed = commit_files(base, paths, 'docs(gamehub): publish immutable PRD v1.5 figures')
    before = snapshot()
    git('update-ref', 'refs/heads/' + BRANCH, commit)
    git('push', '--atomic', 'origin', commit + ':refs/heads/master', commit + ':refs/heads/' + BRANCH)
    assert snapshot() == before
    assert git('ls-remote', 'origin', 'refs/heads/master').decode().split()[0] == commit
    record.update(imageCommit=commit, imageFiles=changed, imagePush='passed')
    RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps({'imageCommit': commit, 'files': len(changed), 'imagePush': 'passed'}))

def docs():
    record = json.loads(RECORD.read_text('utf-8'))
    check_assets()
    source = (OUT / 'prd-v1.4-source.md').read_text('utf-8')
    image_root = 'https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@' + record['imageCommit'] + '/public/prd/gamehub-home-r10-20261106'
    rendered = source.replace('__BASE__', image_root)
    rendered = re.sub(r'(!\[[^\]]*\]\()([^\)]+)(\))', lambda m: m[1] + quote(m[2], safe=':/%') + m[3], rendered)
    assert '待确认' not in rendered
    MD.write_text(rendered, encoding='utf-8', newline='\n')
    names = ['prd-v1.4-source.md', '首页改版说明.md', 'build_docx.py', 'simplify_monthly_prd.py',
             'build_final_flow.py', 'complete_monthly_revision.py', 'render_word_fallback.ps1',
             'monthly-prd-quality.json', 'home-prd-word-verification.json',
             'monthly-simplification-verification.json', 'final-revision-verification.json']
    paths = [MD, PRD / '盖世游戏7.0首页改版PRD_V1.5_飞书导入版.docx', HERE / 'state.md', HERE / 'r10-review.md', HERE / 'sources.json',
             ROOT / 'docs/superpowers/plans/2026-11-06-gamehub-monthly-signin.md',
             ROOT / 'prd/workflow-state/GUANWANGGAID-64-gamehub-70-product.md']
    paths += [OUT / name for name in names if (OUT / name).is_file()]
    git('fetch', 'origin', 'refs/heads/master:refs/remotes/origin/master')
    base = git('rev-parse', 'refs/remotes/origin/master').decode().strip()
    # Other project commits may have arrived; preserve them and refuse scoped conflicts.
    conflicts = git('diff', '--name-only', record['assetCommit'], base, '--', *[p.relative_to(ROOT).as_posix() for p in paths]).decode().strip()
    if conflicts:
        raise RuntimeError('Remote document scope changed; review first: ' + conflicts)
    commit, changed = commit_files(base, paths, 'docs(gamehub): simplify home PRD v1.5 and align weekly sign-in and inline tasks')
    before = snapshot()
    git('update-ref', 'refs/heads/' + BRANCH, commit)
    git('push', '--atomic', 'origin', commit + ':refs/heads/master', commit + ':refs/heads/' + BRANCH)
    assert git('ls-remote', 'origin', 'refs/heads/master').decode().split()[0] == commit
    assert snapshot() == before
    record.update(commit=commit, docsFiles=changed, docsPush='passed', imageBase=image_root,
                  markdownSha256=sha(MD.read_bytes()), wordSha256=sha(paths[1].read_bytes()))
    RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps({'commit': commit, 'files': len(changed), 'docsPush': 'passed'}, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['assets', 'images', 'docs'])
    args = parser.parse_args()
    {'assets': assets, 'images': images, 'docs': docs}[args.stage]()
