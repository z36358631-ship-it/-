from pathlib import Path
root=Path(__file__).parent
p=root/'demo.html'
s=p.read_text(encoding='utf-8')
marker='// REVIEW_STATE_EXTENSION'
if marker in s:s=s[:s.index(marker)]+'</script></body></html>'
s=s.replace('</script></body></html>',marker+'\n'+(root/'state-review.js').read_text(encoding='utf-8')+'\n</script></body></html>')
p.write_text(s,encoding='utf-8')
for name,platform in [('mobile.html','app'),('mac.html','mac')]:
    out=s.replace("const query=new URLSearchParams(location.search);", "const query=new URLSearchParams(location.search);if(!query.has('platform'))query.set('platform','"+platform+"');")
    (root/name).write_text(out,encoding='utf-8')
print('Embedded state panel; built three standalone demos')
