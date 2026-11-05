"""Publish only this lab using a temporary Git index; preserve the user's worktree."""
import hashlib
import json
import os
import pathlib
import subprocess
import uuid

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
KNOWN_BASE = '1d7b3e03f818d823a89364a86a6836dc866c224f'
URL = 'https://z36358631-ship-it.github.io/-/public/gamehub-home-lab/'

def git(*args, env=None, input=None):
    result = subprocess.run(['git', *args], cwd=ROOT, env=env, input=input, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
    return result.stdout.decode('utf-8').strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def publish():
    verification = json.loads((HERE / 'verification.json').read_text(encoding='utf-8'))
    if verification.get('status') != 'passed' or verification.get('artifactSha256') != sha(ROOT / 'public/gamehub-home-lab/index.html'):
        raise RuntimeError('Local validation is not passed')
    if not (HERE / 'review.md').exists():
        raise RuntimeError('Scenario review is missing')
    files = ['public/gamehub-home-lab/index.html', 'docs/superpowers/plans/2026-11-05-gamehub-home-lab.md']
    for path in HERE.iterdir():
        if path.is_file() and path.suffix in ['.html', '.css', '.js', '.cjs', '.py', '.json', '.md', '.ps1'] and path.name not in ['publication.json', 'live-verification.json', 'run.json']:
            files.append(path.relative_to(ROOT).as_posix())
    before_head = git('rev-parse', 'HEAD')
    index = pathlib.Path(git('rev-parse', '--git-path', 'index'))
    if not index.is_absolute():
        index = ROOT / index
    before_index = sha(index)
    baseline = ROOT / 'public/gamehub-pc-console-demo/index.html'
    before_baseline = sha(baseline)
    git('fetch', 'origin', 'refs/heads/master:refs/remotes/origin/master')
    base = git('rev-parse', 'refs/remotes/origin/master')
    conflict = git('diff', '--name-only', KNOWN_BASE, base, '--', *files)
    if conflict:
        raise RuntimeError('Scoped remote changes need reconciliation: ' + conflict)
    temporary_index = HERE / ('.publish-' + uuid.uuid4().hex + '.index')
    env = os.environ.copy()
    env['GIT_INDEX_FILE'] = str(temporary_index)
    try:
        git('read-tree', base, env=env)
        for file in files:
            blob = git('hash-object', '-w', '--', file)
            git('update-index', '--add', '--cacheinfo', '100644,' + blob + ',' + file, env=env)
        tree = git('write-tree', env=env)
        changed = git('diff-tree', '--no-commit-id', '--name-only', '-r', base, tree).splitlines()
        if not changed or any(file not in files for file in changed):
            raise RuntimeError('Publication scope check failed')
        commit = git('commit-tree', tree, '-p', base, '-m', 'Add three GameHub home content directions with scenario walkthrough revisions')
        git('push', 'origin', commit + ':refs/heads/master')
        if git('rev-parse', 'HEAD') != before_head or sha(index) != before_index or sha(baseline) != before_baseline:
            raise RuntimeError('Workspace preservation check failed')
        result = {'commit': commit, 'base': base, 'files': changed, 'url': URL, 'headPreserved': True, 'indexPreserved': True, 'existingDemoPreserved': True, 'bytes': (ROOT / files[0]).stat().st_size, 'sha256': sha(ROOT / files[0])}
        (HERE / 'publication.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=False))
    finally:
        if temporary_index.exists():
            temporary_index.unlink()

if __name__ == '__main__':
    publish()
