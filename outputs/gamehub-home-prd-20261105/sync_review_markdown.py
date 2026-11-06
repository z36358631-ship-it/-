from pathlib import Path
import argparse,re

ap=argparse.ArgumentParser()
ap.add_argument('--public-base',help='Published immutable r11 image base; defaults to retaining the current base')
args=ap.parse_args()
out=Path(__file__).resolve().parent
target=out.parents[1]/'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求/【PRD】《盖世游戏》7.0首页改版需求.md'
s=(out/'prd-v1.4-source.md').read_text('utf-8')
base=args.public_base or re.search(r'!\[首页产品流程\]\((.+)/flow-revision.png\)',target.read_text('utf-8'))[1]
assert base.startswith('https://')
(out/'prd-v1.4-Draft.md').write_text(s.replace('__BASE__',out.as_posix()),encoding='utf-8')
target.write_text(s.replace('__BASE__',base.rstrip('/')),encoding='utf-8')
print(target)
