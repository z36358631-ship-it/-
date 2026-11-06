from pathlib import Path
import argparse,hashlib,importlib.util,json,re,shutil
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=ROOT/'outputs/gamehub-home-prd-20261105'
spec=importlib.util.spec_from_file_location('scoped',HERE/'publish-r10.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
RECORD=HERE/'publication-v17.json';PRD=ROOT/'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求';MD=PRD/'【PRD】《盖世游戏》7.0首页改版需求.md';WORD=PRD/'盖世游戏7.0首页改版PRD_V1.7_飞书导入版.docx'
read=lambda p:json.loads(p.read_text('utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(r):RECORD.write_text(json.dumps(r,ensure_ascii=False,indent=2),'utf-8')
def images():
 old=read(HERE/'publication-r12.json');source=(OUT/'prd-v1.7-source.md').read_text('utf-8');names=re.findall(r'!\[[^\]]*\]\(__BASE__/([^)]+)\)',source);assert len(names)==27
 paths=[]
 for name in names:
  dest=ROOT/'public/prd/gamehub-home-r11-20261106'/name;shutil.copyfile(OUT/name,dest);paths.append(dest)
 before=h.snapshot();commit,changed=h.commit_files(old['imageCommit'],paths,'docs(gamehub): add corresponding home submodule figures for PRD v1.7');branch='codex/gamehub-home-v17-images-20261106'
 # The image branch intentionally remains a small image-only tree.
 files=h.git('ls-tree','-r','--name-only',commit).decode().splitlines();assert all(p.startswith('public/prd/') for p in files)
 h.git('update-ref','refs/heads/'+branch,commit);h.git('push','origin',commit+':refs/heads/'+branch);assert h.snapshot()==before
 r={'version':'V1.7','decisions':['D111','D112'],'annotation':'2026.11.6修改','imageCommit':commit,'imageBranch':branch,'imageFiles':[p.relative_to(ROOT).as_posix() for p in paths],'imageChangedFiles':changed,'imageBase':'https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@'+commit+'/public/prd/gamehub-home-r11-20261106','imagePush':'passed','docsPush':'pending','headIndexPreserved':True,'demoChanged':False,'feishuImportVerified':False};write(r)
 MD.write_text(source.replace('__BASE__',r['imageBase']),'utf-8');print(json.dumps({'imageCommit':commit,'images':len(paths)}))
def docs():
 r=read(RECORD);v=read(OUT/'review-v17-verification.json');assert v['status']=='passed' and v['wordSha256']==sha(WORD) and v['markdownSha256']==sha(MD)
 assert read(HERE/'remote-images-v17.json')['status']=='passed'
 paths=[MD,WORD,HERE/'state.md',HERE/'run.json',HERE/'publish-prd-v17.py',HERE/'verify-remote-v17.py',HERE/'remote-images-v17.json',ROOT/'prd/workflow-state/GUANWANGGAID-64-gamehub-70-product.md']
 names=['prd-v1.7-source.md','prd-v1.7-Draft.md','prd-v1.7-semantic-brief.md','prd-v1.7-semantic-brief.json','build_docx_v17.py','render_word_v17.ps1','render_pdf_v17.py','verify_prd_v17.py','images-v17-validation.txt','capture-submodules-v17.cjs','submodule-image-verification.json','word-v17-verification.json','quality-v17-draft.json','quality-v17-formal.json','review-v17-verification.json','render-v17/word-render.json','render-v17/page-audit.json']
 paths += [OUT/n for n in names];paths += list(OUT.glob('module-*.png'))
 h.git('fetch','origin','refs/heads/master:refs/remotes/origin/master');base=h.git('rev-parse','refs/remotes/origin/master').decode().strip()
 conflict=h.git('diff','--name-only','e9aaa83fefedc015361e69702cc24d1b5aa223f8',base,'--',*[p.relative_to(ROOT).as_posix() for p in paths]).decode().strip();assert not conflict,conflict
 before=h.snapshot();commit,changed=h.commit_files(base,paths,'docs(gamehub): simplify full PRD and keep illustrated subfunctions in one four-column table');branch='codex/gamehub-home-prd-v17-20261106'
 h.git('update-ref','refs/heads/'+branch,commit);h.git('push','--atomic','origin',commit+':refs/heads/master',commit+':refs/heads/'+branch);assert h.snapshot()==before
 assert h.git('ls-remote','origin','refs/heads/master').decode().split()[0]==commit
 r.update(commit=commit,base=base,docsFiles=changed,docsPush='passed',wordSha256=sha(WORD),markdownSha256=sha(MD));write(r);print(json.dumps({'commit':commit,'files':len(changed)}))
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('stage',choices=['images','docs']);a=ap.parse_args();globals()[a.stage]()
