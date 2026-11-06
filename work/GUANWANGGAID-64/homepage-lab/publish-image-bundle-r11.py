"""Publish a small, parentless image tree for jsDelivr's 50 MB package limit.

This updates only an image branch. The working branch, shared index and master
are never replaced by the small tree.
"""
import importlib.util,json
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
spec=importlib.util.spec_from_file_location('helper',HERE/'publish-r10.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
p=HERE/'publication-r11.json';r=json.loads(p.read_text('utf-8'))
paths=[ROOT/n for n in r['imageFiles']]
assert len(paths)==20 and sum(x.stat().st_size for x in paths)<10*1024*1024
before=h.snapshot();master=h.git('ls-remote','origin','refs/heads/master').decode().split()[0]
empty_tree=h.git('mktree',data=b'').decode().strip()
empty_commit=h.git('commit-tree',empty_tree,'-m','chore: start lightweight home PRD image bundle').decode().strip()
commit,changed=h.commit_files(empty_commit,paths,'docs(gamehub): immutable November 6 PRD image bundle')
branch='codex/gamehub-home-r11-images-20261106'
h.git('update-ref','refs/heads/'+branch,commit)
h.git('push','origin',commit+':refs/heads/'+branch)
assert h.snapshot()==before
assert h.git('ls-remote','origin','refs/heads/master').decode().split()[0]==master
r.update(imagePublicationBase=master,imageCommit=commit,imageBranch=branch,imageBundleBytes=sum(x.stat().st_size for x in paths),imageBase='https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@'+commit+'/public/prd/gamehub-home-r11-20261106',imagePush='passed',imagePackage='small image-only tree; default branch untouched')
p.write_text(json.dumps(r,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps({'imageCommit':commit,'imageBase':r['imageBase'],'bytes':r['imageBundleBytes'],'masterUnchanged':master}))
