// 校验 PRD 图片 CDN 链接：状态码 200 + MIME image/* + 体积 > 0，失败自动重试 2 次
const fs = require("fs");
const path = require("path");
const https = require("https");

const mdPath = path.resolve(__dirname, "..", "【Prd】《盖世游戏》兼容性查询与启动配置分享码需求.md");
const md = fs.readFileSync(mdPath, "utf8");
const urls = [...new Set([...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]))];

function head(url, deadline = 30000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let size = 0;
      res.on("data", (c) => { size += c.length; });
      res.on("end", () => resolve({
        status: res.statusCode,
        type: res.headers["content-type"] || "",
        size,
        final: res.responseUrl || url
      }));
    });
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, type: "timeout", size: 0 }); });
    req.on("error", () => resolve({ status: 0, type: "error", size: 0 }));
    setTimeout(() => { req.destroy(); resolve({ status: 0, type: "timeout", size: 0 }); }, deadline);
  });
}

(async () => {
  let bad = 0;
  for (const url of urls) {
    let r = await head(url);
    for (let i = 0; i < 2 && !(r.status === 200 && /^image\//.test(r.type) && r.size > 0); i += 1) {
      r = await head(url);
    }
    const ok = r.status === 200 && /^image\//.test(r.type) && r.size > 0;
    if (!ok) bad += 1;
    const file = decodeURIComponent(url.split("/").pop());
    console.log((ok ? "OK  " : "FAIL") + " " + r.status + " " + r.type + " " + r.size + "  " + file);
  }
  console.log("---");
  console.log("链接总数 " + urls.length + "，失败 " + bad);
})();
