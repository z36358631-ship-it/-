import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const shellRoot = path.resolve("wechat-miniprogram-shell");
const requiredFiles = [
  "app.js",
  "app.json",
  "app.wxss",
  "project.config.json",
  "sitemap.json",
  "routing.js",
  "README.md",
  "pages/index/index.js",
  "pages/index/index.json",
  "pages/index/index.wxml",
  "pages/index/index.wxss",
  "pages/game/game.js",
  "pages/game/game.json",
  "pages/game/game.wxml",
  "pages/game/game.wxss",
];

export async function verifyMiniprogramShell(root = shellRoot) {
  const sources = new Map();
  for (const relative of requiredFiles) {
    const source = await readFile(path.join(root, relative), "utf8");
    if (!source.trim()) throw new Error(`MINIPROGRAM_EMPTY:${relative}`);
    sources.set(relative, source);
    if (relative.endsWith(".json")) {
      try {
        JSON.parse(source);
      } catch {
        throw new Error(`MINIPROGRAM_JSON_INVALID:${relative}`);
      }
    }
  }

  const project = JSON.parse(sources.get("project.config.json"));
  if (project.appid !== "touristappid") {
    throw new Error("MINIPROGRAM_APPID_MUST_BE_TOURIST");
  }

  const routingPath = path.join(root, "routing.js");
  delete require.cache[require.resolve(routingPath)];
  const { ROUTES, resolveGameUrl } = require(routingPath);
  const expected = {
    ricochet: "/games/ricochet-crew/",
    nightmarket: "/games/monster-night-market/",
    squad: "/games/three-lane-squad/",
  };
  if (JSON.stringify(ROUTES) !== JSON.stringify(expected)) {
    throw new Error("MINIPROGRAM_ROUTES_INVALID");
  }
  if (resolveGameUrl("", "ricochet") !== null) {
    throw new Error("MINIPROGRAM_EMPTY_BASE_MUST_BLOCK");
  }
  const resolved = resolveGameUrl("https://h5-review.internal", "squad");
  if (resolved !== "https://h5-review.internal/games/three-lane-squad/") {
    throw new Error("MINIPROGRAM_HTTPS_ROUTE_INVALID");
  }

  const runtime = [
    sources.get("app.js"),
    sources.get("routing.js"),
    sources.get("pages/index/index.js"),
    sources.get("pages/game/game.js"),
  ].join("\n");
  if (/openid|session_key|phone|mobile|cookie|authorization/iu.test(runtime)) {
    throw new Error("MINIPROGRAM_SENSITIVE_RUNTIME_FIELD");
  }
  if (!/h5BaseUrl:\s*""/u.test(sources.get("app.js"))) {
    throw new Error("MINIPROGRAM_BASE_URL_MUST_BE_UNCONFIGURED");
  }
  if (!/wx:if="\{\{src\}\}"/u.test(sources.get("pages/game/game.wxml"))) {
    throw new Error("MINIPROGRAM_WEBVIEW_GUARD_MISSING");
  }
  if (!/touristappid.*不可用于发布/us.test(sources.get("README.md"))) {
    throw new Error("MINIPROGRAM_NON_PRODUCTION_WARNING_MISSING");
  }
  return {
    files: requiredFiles.length,
    routes: Object.keys(expected).length,
    baseUrlConfigured: false,
    productionReady: false,
    realWechatProduction: "NOT EXECUTED",
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await verifyMiniprogramShell();
  process.stdout.write(
    `MINIPROGRAM_SHELL PASS · ${result.files} files · ${result.routes} routes · production NOT EXECUTED\n`,
  );
}
