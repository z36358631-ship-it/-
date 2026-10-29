"""构建独立远程双端与PRD预览；加 --capture 时重新生成当前截图与流程图。"""
from pathlib import Path
import subprocess, sys, shutil
R=Path(__file__).parent

def py(name):
    subprocess.run([sys.executable,'-X','utf8',str(R/name)],check=True,cwd=R)

py('build_mobile.py')
py('build_mac_standalone.py')
if '--capture' in sys.argv:
    node=shutil.which('node')
    if not node:
        bundled=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
        if bundled.exists():node=str(bundled)
    if not node:raise SystemExit('未找到 Node.js；请使用已配置的工作区运行时。')
    subprocess.run([node,str(R/'capture_standalone.cjs')],check=True,cwd=R,stdout=subprocess.DEVNULL)
    py('build_standalone_flow.py')
py('build_standalone_docs.py')
print('Independent demos and PRD preview built.')
