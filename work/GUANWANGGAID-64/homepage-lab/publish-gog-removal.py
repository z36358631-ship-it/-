"""2026.11.6修改: remove GOG from this release, preserving shared Git state."""
import argparse,hashlib,importlib.util,json,re,shutil
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=ROOT/'outputs/gamehub-home-prd-20261105'
spec=importlib.util.spec_from_file_location('scoped',HERE/'publish-r10.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
RECORD=HERE/'publication-r12.json';BRANCH='codex/gamehub-home-r12-20261106'
read=lambda p:json.loads(p.read_text('utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(r):RECORD.write_text(json.dumps(r,ensure_ascii=False,indent=2),'utf-8')
def publish(paths,prior,message):
 paths=list(set(paths));h.git('fetch','origin','refs/heads/master:refs/remotes/origin/master');base=h.git('rev-parse','refs/remotes/origin/master').decode().strip()
 conflict=h.git('diff','--name-only',prior,base,'--',*[p.relative_to(ROOT).as_posix() for p in paths]).decode().strip();assert not conflict,conflict
 before=h.snapshot();commit,changed=h.commit_files(base,paths,message);h.git('update-ref','refs/heads/'+BRANCH,commit);h.git('push','--atomic','origin',commit+':refs/heads/master',commit+':refs/heads/'+BRANCH);assert h.snapshot()==before
 return commit,changed
def assets():
 digest=sha(ROOT/'public/gamehub-home-lab/index.html')
 for file,key in [('verification.json','artifactSha256'),('review-r11-evidence/verification.json','htmlSha256')]:
  d=read(HERE/file);assert d['status']=='passed' and d[key]==digest
 paths=[HERE/n for n in ['retention.js','verify.cjs','review-verify-r11.cjs','verification.json','review-r11-evidence/verification.json','build-manifest.json','state.md','publish-gog-removal.py']]+[ROOT/'public/gamehub-home-lab/index.html']
 commit,files=publish(paths,'ae0ccc15ec8124ad67dfc8554638dc6a6a951d6b','fix(gamehub): remove GOG from current giveaway release')
 write({'version':'r12','decision':'D110','annotation':'2026.11.6修改','scope':'Current release includes only Epic and Steam; supersedes earlier GOG interpretation.','assetCommit':commit,'assetFiles':files,'sha256':digest,'url':'https://z36358631-ship-it.github.io/-/public/gamehub-home-lab/','assetPush':'passed','docsPush':'pending','headIndexPreserved':True});print(json.dumps({'assetCommit':commit}))
def images():
 r=read(RECORD);old=read(HERE/'publication-r11.json');names=re.findall(r'!\[[^\]]*\]\(__BASE__/([^\)]+)\)',(OUT/'prd-v1.4-source.md').read_text('utf-8'));paths=[]
 for name in names:
  dest=ROOT/'public/prd/gamehub-home-r11-20261106'/name;shutil.copyfile(OUT/name,dest);paths.append(dest)
 before=h.snapshot();commit,files=h.commit_files(old['imageCommit'],paths,'docs(gamehub): update two-platform giveaway figure');branch='codex/gamehub-home-r12-images-20261106';h.git('update-ref','refs/heads/'+branch,commit);h.git('push','origin',commit+':refs/heads/'+branch);assert h.snapshot()==before
 r.update(imageCommit=commit,imageFiles=[p.relative_to(ROOT).as_posix() for p in paths],imageChangedFiles=files,imageBase='https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@'+commit+'/public/prd/gamehub-home-r11-20261106',imageBranch=branch,imagePush='passed');write(r);print(json.dumps({'imageCommit':commit,'imageBase':r['imageBase']}))
def docs():
 r=read(RECORD);report=read(OUT/'review-v16-verification.json');assert report['sourceMarkdownWordAlignment']=='passed' and report['wordReview']['status']=='passed';assert read(HERE/'remote-images-r12.json')['status']=='passed'
 prd=ROOT/'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求';md=prd/'【PRD】《盖世游戏》7.0首页改版需求.md';word=prd/'盖世游戏7.0首页改版PRD_V1.6_飞书导入版.docx';assert report['wordSha256']==sha(word) and r['imageBase'] in md.read_text('utf-8')
 names=['prd-v1.4-source.md','prd-v1.4-Draft.md','2026.11.6评审修改对照.md','verify_review_v16.py','home-prd-word-verification.json','review-v16-verification.json','review-v16-prd-quality.json','review-v16-manual-evidence.json','render-v16/word-render.json','giveaways.png']
 paths=[OUT/n for n in names]+[md,word,HERE/'state.md',HERE/'sources.json',HERE/'publish-gog-removal.py',HERE/'verify-remote-r12.py',HERE/'remote-images-r12.json',ROOT/'prd/workflow-state/GUANWANGGAID-64-gamehub-70-product.md']
 commit,files=publish(paths,r['assetCommit'],'docs(gamehub): align PRD and Word with current two-platform scope');r.update(commit=commit,docsFiles=files,wordSha256=sha(word),markdownSha256=sha(md),docsPush='passed');write(r);print(json.dumps({'commit':commit,'files':len(files)}))
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('stage',choices=['assets','images','docs']);a=ap.parse_args();globals()[a.stage]()
