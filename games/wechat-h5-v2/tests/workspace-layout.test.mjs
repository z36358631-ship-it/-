import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workspace root owns the v2 build and verification commands", async () => {
  const root = new URL("../package.json", import.meta.url);
  const pkg = JSON.parse(await readFile(root, "utf8"));
  assert.deepEqual(pkg.workspaces, ["apps/*", "packages/*"]);
  assert.equal(pkg.engines.node, ">=20.11");
  for (const command of [
    "typecheck",
    "test",
    "test:e2e",
    "test:performance",
    "assets:export",
    "assets:manifest",
    "assets:validate",
    "build",
    "verify",
  ]) {
    assert.equal(typeof pkg.scripts[command], "string", `missing ${command}`);
  }
});
