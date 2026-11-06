"""Publish the reviewed r9 files without touching the shared checkout or index."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import uuid

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'outputs/gamehub-home-prd-20261105'
PRD = Path('prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求')
BRANCH = 'codex/gamehub-home-r9-publish-20261106'
URL = 'https://z36358631-ship-it.github.io/-/public/gamehub-home-lab/'


def git(*args, env=None, data=None):
    result = subprocess.run(['git', '-c', 'http.version=HTTP/1.1', *args],
                            cwd=ROOT, env=env, input=data, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
    return result.stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def publish():
    report = json.loads((OUT / 'final-revision-verification.json').read_text('utf-8'))
    assert report['sourceMarkdownWordAlignment'] == 'passed'
    assert report['wordReview']['status'] == 'passed_for_local_review'
    assert report['quality']['errorCount'] == 0
    for key, relative in [('artifactSha256', 'public/gamehub-home-lab/index.html'),
                          ('adminSha256', 'public/gamehub-home-lab/admin.html')]:
        assert sha((ROOT / relative).read_bytes()) == report['build'][key], relative
    verification = json.loads((HERE / 'verification.json').read_text('utf-8'))
    assert verification['status'] == 'passed'
    assert verification['artifactSha256'] == report['build']['artifactSha256']

    lab_files = ['app.html', 'app.css', 'retention.css', 'concepts.css', 'purchase.css',
                 'conversion.css', 'timeline.css', 'compatibility.css', 'review-shell.css',
                 'resume.css', 'tasks-revision.css', 'platform.js', 'retention.js',
                 'purchase.js', 'conversion.js', 'concepts.js', 'timeline.js',
                 'compatibility.js', 'tasks-revision.js', 'app.js', 'media.json',
                 'build.py', 'build-manifest.json', 'admin.css', 'admin.js',
                 'admin.template.html', 'admin.html', 'build-admin.py', 'verify.cjs',
                 'tasks-verify.cjs', 'verify-admin.cjs', 'verify-admin-recovery.cjs',
                 'verification.json', 'tasks-evidence/verification.json',
                 'admin-verification.json', 'admin-recovery-verification.json',
                 'r9-review.md', 'publish-r9.py']
    files = [ROOT / 'public/gamehub-home-lab/index.html', ROOT / 'public/gamehub-home-lab/admin.html']
    files += [HERE / name for name in lab_files]
    files += [ROOT / PRD / '【PRD】《盖世游戏》7.0首页改版需求.md',
              ROOT / PRD / '盖世游戏7.0首页改版PRD_V1.4_飞书导入版.docx',
              ROOT / 'docs/superpowers/plans/2026-11-05-gamehub-home-r9-completion.md']
    files += [Path(item['path']) for item in report['images']]
    files += [OUT / '首页改版说明.md', OUT / 'final-revision-verification.json',
              OUT / 'home-prd-word-verification.json']
    paths = {p.relative_to(ROOT).as_posix(): p for p in files}
    assert all(p.is_file() for p in paths.values())
    assert sha((ROOT / PRD / '盖世游戏7.0首页改版PRD_V1.4_飞书导入版.docx').read_bytes()) == report['wordSha256']

    head = git('rev-parse', 'HEAD').strip()
    index = Path(git('rev-parse', '--git-path', 'index').decode().strip())
    if not index.is_absolute():
        index = ROOT / index
    index_sha = sha(index.read_bytes())
    git('fetch', 'origin', 'refs/heads/master:refs/remotes/origin/master')
    base = git('rev-parse', 'refs/remotes/origin/master').decode().strip()
    previous = json.loads((HERE / 'publication.json').read_text('utf-8'))['commit']
    conflicts = git('diff', '--name-only', previous, base, '--', *paths).decode().strip()
    if conflicts:
        raise RuntimeError('Remote files changed since the reviewed baseline: ' + conflicts)

    temp_index = HERE / ('.publish-r9-' + uuid.uuid4().hex + '.index')
    env = dict(os.environ, GIT_INDEX_FILE=str(temp_index))
    transformations = []
    try:
        git('read-tree', base, env=env)
        for relative, path in paths.items():
            content = path.read_bytes()
            if relative == (PRD / '【PRD】《盖世游戏》7.0首页改版需求.md').as_posix():
                text = content.decode('utf-8')
                image_root = os.path.relpath(OUT, path.parent).replace('\\', '/')
                text = text.replace(OUT.as_posix(), image_root)
                assert not re.search(r'!\[[^\]]*\]\([A-Za-z]:', text)
                for image in re.findall(r'!\[[^\]]*\]\(([^)]+)\)', text):
                    assert (path.parent / image).resolve().is_file(), image
                content = text.encode('utf-8')
                transformations.append({'file': relative, 'change': 'Git copy uses relative paths to the same 13 committed images; local Markdown and embedded Word unchanged'})
            blob = git('hash-object', '-w', '--stdin', data=content).decode().strip()
            git('update-index', '--add', '--cacheinfo', '100644,' + blob + ',' + relative, env=env)
        tree = git('write-tree', env=env).decode().strip()
        changed = git('-c', 'core.quotepath=false', 'diff-tree', '--no-commit-id', '--name-only', '-r', base, tree).decode('utf-8').splitlines()
        assert changed and set(changed) <= set(paths)
        commit = git('commit-tree', tree, '-p', base, '-m',
                     'feat(gamehub): publish 7.0 home r9 layout, admin demo and PRD v1.4').decode().strip()
        git('update-ref', 'refs/heads/' + BRANCH, commit)
        assert git('rev-parse', 'HEAD').strip() == head
        assert sha(index.read_bytes()) == index_sha
        record = {'version': 'r9', 'commit': commit, 'base': base, 'branch': BRANCH,
                  'url': URL, 'files': changed, 'headPreserved': True, 'indexPreserved': True,
                  'sha256': report['build']['artifactSha256'],
                  'adminSha256': report['build']['adminSha256'], 'bytes': paths['public/gamehub-home-lab/index.html'].stat().st_size,
                  'transformations': transformations, 'pushStatus': 'pending', 'previewStatus': 'pending'}
        (HERE / 'publication-r9.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), 'utf-8')
        git('push', '--atomic', 'origin', commit + ':refs/heads/master', commit + ':refs/heads/' + BRANCH)
        remote = git('ls-remote', 'origin', 'refs/heads/master').decode().split()[0]
        assert remote == commit
        assert git('rev-parse', 'HEAD').strip() == head
        assert sha(index.read_bytes()) == index_sha
        record['pushStatus'] = 'passed'
        (HERE / 'publication-r9.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), 'utf-8')
        print(json.dumps({'commit': commit, 'base': base, 'changedFiles': len(changed), 'pushStatus': 'passed', 'headPreserved': True, 'indexPreserved': True}, ensure_ascii=False))
    finally:
        temp_index.unlink(missing_ok=True)


if __name__ == '__main__':
    publish()
