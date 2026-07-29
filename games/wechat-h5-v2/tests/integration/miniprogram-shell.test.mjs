import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve("wechat-miniprogram-shell");
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

test("miniprogram shell has complete parseable project files", async () => {
  for (const file of requiredFiles) {
    assert.ok((await readFile(path.join(root, file))).length > 0, file);
  }
  for (const file of requiredFiles.filter((file) => file.endsWith(".json"))) {
    const json = await readFile(path.join(root, file), "utf8");
    assert.doesNotThrow(() => JSON.parse(json));
  }
  const project = JSON.parse(
    await readFile(path.join(root, "project.config.json"), "utf8"),
  );
  assert.equal(project.appid, "touristappid");
});

test("routes use a configured HTTPS origin and never append credentials", async () => {
  const imported = await import(
    "../../wechat-miniprogram-shell/routing.js"
  );
  const { ROUTES, resolveGameUrl } = imported.default ?? imported;
  assert.deepEqual({ ...ROUTES }, {
    ricochet: "/games/ricochet-crew/",
    nightmarket: "/games/monster-night-market/",
    squad: "/games/three-lane-squad/",
  });
  assert.equal(
    resolveGameUrl("https://h5-review.internal/", "nightmarket"),
    "https://h5-review.internal/games/monster-night-market/",
  );
  for (const invalid of [
    "",
    "http://h5-review.internal",
    "https://example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://replace-me.invalid",
    "https://h5.gamehub.test",
  ]) {
    assert.equal(resolveGameUrl(invalid, "squad"), null);
  }
  const output = resolveGameUrl("https://h5-review.internal", "unknown");
  assert.equal(output, "https://h5-review.internal/games/ricochet-crew/");
  assert.doesNotMatch(
    output,
    /openid|session_key|phone|mobile|cookie|token|authorization/iu,
  );
});

test("game page withholds web-view until configuration is valid", async () => {
  const app = await readFile(path.join(root, "app.js"), "utf8");
  const gamePage = await readFile(
    path.join(root, "pages/game/game.js"),
    "utf8",
  );
  const gameView = await readFile(
    path.join(root, "pages/game/game.wxml"),
    "utf8",
  );
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  assert.match(app, /h5BaseUrl:\s*""/u);
  assert.match(gamePage, /src:\s*""/u);
  assert.match(gameView, /wx:if="\{\{src\}\}"/u);
  assert.match(gameView, /配置错误/u);
  assert.match(readme, /touristappid.*不可用于发布/us);
  assert.match(readme, /非生产/u);
  assert.doesNotMatch(
    `${app}\n${gamePage}`,
    /openid|session_key|phone|mobile|cookie|authorization/iu,
  );
});
