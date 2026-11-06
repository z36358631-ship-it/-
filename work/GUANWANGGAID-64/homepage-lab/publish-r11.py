"""2026.11.6修改: scoped publication with shared HEAD and index preserved."""
import argparse, hashlib, importlib.util, json, re, shutil
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
OUT=ROOT/'outputs/gamehub-home-prd-20261105'
PRD=ROOT/'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求'
RECORD=HERE/'publication-r11.json'
BRANCH='codex/gamehub-home-r11-20261106'
spec=importlib.util.spec_from_file_location('scoped_publish',HERE/'publish-r10.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
git,commit_files,snapshot=helper.git,helper.commit_files,helper.snapshot
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text('utf-8'))
def write(d):RECORD.write_text(json.dumps(d,ensure_ascii=False,indent=2),'utf-8')
def check():
 digest=sha(ROOT/'public/gamehub-home-lab/index.html')
 for file,key in [('verification.json','artifactSha256'),('tasks-evidence/verification.json','htmlSha256'),('monthly-evidence/verification.json','htmlSha256'),('review-r11-evidence/verification.json','htmlSha256')]:
  d=read(HERE/file);assert d['status']=='passed' and d[key]==digest,file
 admin=read(HERE/'admin-review-evidence/verification.json');assert admin['status']=='passed' and admin['artifactSha256']==sha(ROOT/'public/gamehub-home-lab/admin.html')
 return digest
def publish(paths,prior,message):
 paths=list(set(paths));assert all(p.is_file() for p in paths)
 git('fetch','origin','refs/heads/master:refs/remotes/origin/master')
 base=git('rev-parse','refs/remotes/origin/master').decode().strip()
 conflicts=git('diff','--name-only',prior,base,'--',*[p.relative_to(ROOT).as_posix() for p in paths]).decode().strip()
 assert not conflicts,'Scoped remote changes require review: '+conflicts
 commit,changed=commit_files(base,paths,message);before=snapshot()
 git('update-ref','refs/heads/'+BRANCH,commit)
 git('push','--atomic','origin',commit+':refs/heads/master',commit+':refs/heads/'+BRANCH)
 assert snapshot()==before
 assert git('ls-remote','origin','refs/heads/master').decode().split()[0]==commit
 return commit,changed,base
def assets():
 digest=check()
 names=['app.js','app.html','build.py','build-manifest.json','retention.js','concepts.js','timeline.js','subscriptions.js','subscriptions.css','tasks-revision.js','verify.cjs','tasks-verify.cjs','verify-monthly.cjs','review-verify-r11.cjs','publish-r11.py','sources.json','r11-review.md','state.md','admin.js','admin.css','admin.template.html','build-admin.py','admin-build.json','verify-admin.cjs','verify-admin-review.cjs','verification.json','tasks-evidence/verification.json','monthly-evidence/verification.json','review-r11-evidence/verification.json','admin-review-evidence/verification.json','admin-review-evidence/review.md']
 paths=[HERE/n for n in names]
 paths += [ROOT/'public/gamehub-home-lab/index.html',ROOT/'public/gamehub-home-lab/admin.html',ROOT/'docs/superpowers/plans/2026-11-06-gamehub-review-r11.md']
 paths += list((HERE/'review-r11-evidence').glob('*.png'))+list((HERE/'admin-review-evidence').glob('*.png'))
 commit,changed,base=publish(paths,read(RECORD)['assetCommit'] if RECORD.exists() else '7c80392455a65a17903ea98093e4304cfe140f8d','fix(gamehub): apply November 6 home review and dated change notes')
 write({'version':'r11','annotation':'2026.11.6修改','assetCommit':commit,'base':base,'branch':BRANCH,'sha256':digest,'adminSha256':sha(ROOT/'public/gamehub-home-lab/admin.html'),'assetFiles':changed,'assetPush':'passed','imagePush':'pending','docsPush':'pending','url':'https://z36358631-ship-it.github.io/-/public/gamehub-home-lab/','headPreserved':True,'indexPreserved':True})
 print(json.dumps({'assetCommit':commit,'files':len(changed)}))
def images():
 r=read(RECORD);check();dest=ROOT/'public/prd/gamehub-home-r11-20261106';dest.mkdir(parents=True,exist_ok=True)
 paths=[]
 for name in re.findall(r'!\[[^\]]*\]\(__BASE__/([^\)]+)\)',(OUT/'prd-v1.4-source.md').read_text('utf-8')):
  target=dest/name;shutil.copyfile(OUT/name,target);paths.append(target)
 commit,changed,base=publish(paths,r.get('imageCommit',r['assetCommit']),'docs(gamehub): publish immutable reviewed v1.6 figures')
 r.update(imageCommit=commit,imageFiles=[p.relative_to(ROOT).as_posix() for p in paths],imageChangedFiles=changed,imagePush='passed',imageBase='https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@'+commit+'/public/prd/gamehub-home-r11-20261106');write(r);print(json.dumps({'imageCommit':commit,'files':len(changed),'imageBase':r['imageBase']}))
def docs():
 r=read(RECORD);check();report=read(OUT/'review-v16-verification.json')
 assert report['status']=='passed_with_user_template_override' and report['sourceMarkdownWordAlignment']=='passed' and report['wordReview']['status']=='passed',report
 assert report['quality']['errorCount']==1 and report['quality']['userOverride']['code']=='PENDING_SECTION_MISSING',report['quality']
 assert read(HERE/'remote-images-r11.json')['status']=='passed'
 md=PRD/'【PRD】《盖世游戏》7.0首页改版需求.md';word=PRD/'盖世游戏7.0首页改版PRD_V1.6_飞书导入版.docx'
 assert r['imageBase'] in md.read_text('utf-8') and '2026.11.6修改' in md.read_text('utf-8')
 names=['prd-v1.4-source.md','prd-v1.4-Draft.md','首页改版说明.md','2026.11.6评审修改对照.md','build_docx.py','build_final_flow.py','sync_review_markdown.py','review-v16-verification.json','review-v16-prd-quality.json','review-v16-text-verification.json','revise_review_v16.py','verify_review_v16.py','render-v16/word-render.json','home-prd-word-verification.json']
 paths=[OUT/n for n in names if (OUT/n).is_file()]+[md,word,HERE/'state.md',HERE/'r11-review.md',HERE/'sources.json',HERE/'publish-r11.py',HERE/'remote-images-r11.json',HERE/'verify-remote-r11.py',HERE/'publish-image-bundle-r11.py',HERE/'review-verify-r11.cjs',ROOT/'prd/workflow-state/GUANWANGGAID-64-gamehub-70-product.md']
 paths += [OUT/n for n in re.findall(r'!\[[^\]]*\]\(__BASE__/([^\)]+)\)',(OUT/'prd-v1.4-source.md').read_text('utf-8'))]+[OUT/'home-top.png']
 commit,changed,base=publish(paths,r.get('imagePublicationBase',r['imageCommit']),'docs(gamehub): align PRD v1.6 and mark all November 6 review changes')
 r.update(commit=commit,docsFiles=changed,docsPush='passed',markdownSha256=sha(md),wordSha256=sha(word));write(r);print(json.dumps({'commit':commit,'files':len(changed)}))
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('stage',choices=['assets','images','docs']);args=ap.parse_args();globals()[args.stage]()
