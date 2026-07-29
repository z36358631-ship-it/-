import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyTeamCollaboration } from "../../tools/verify-team-collaboration.mjs";

const columns = [
  "startedAt",
  "finishedAt",
  "activeMinutes",
  "role",
  "agent/task",
  "objective",
  "inputs",
  "output",
  "evidencePath",
  "evidenceSha256",
  "reviewer",
];

async function fixture(rows) {
  const root = await mkdtemp(path.join(os.tmpdir(), "h5-collab-"));
  const evidence = path.join(root, "evidence.json");
  const content = JSON.stringify({
    exitCode: 0,
    summary: { pass: 1, fail: 0 },
  });
  await writeFile(evidence, content);
  const sha = createHash("sha256").update(content).digest("hex");
  const table = [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) =>
      `| ${columns.map((column) =>
        String(row[column] ?? (column === "evidencePath"
          ? "evidence.json"
          : column === "evidenceSha256"
            ? sha
            : "-"))
        ).join(" | ")} |`
    ),
  ].join("\n");
  const log = path.join(root, "log.md");
  await writeFile(log, table);
  return { root, log, sha };
}

function row({
  start,
  minutes,
  role,
  agent,
  output,
  objective = "实现并验证独立模块",
}) {
  const startedAt = new Date(start).toISOString();
  const finishedAt = new Date(new Date(start).getTime() + minutes * 60_000)
    .toISOString();
  return {
    startedAt,
    finishedAt,
    activeMinutes: minutes,
    role,
    "agent/task": agent,
    objective,
    inputs: "approved-plan",
    output,
    reviewer: "主管",
  };
}

test("passes only a 480-minute active union with six roles and valid evidence", async () => {
  const roles = ["产品", "运行时", "玩法", "美术", "测试", "交付"];
  const base = Date.parse("2026-07-29T00:00:00.000Z");
  const rows = roles.map((role, index) =>
    row({
      start: new Date(base + index * 80 * 60_000),
      minutes: 80,
      role,
      agent: `agent-${index + 1}`,
      output: `output-${index + 1}.md`,
    })
  );
  const { root, log } = await fixture(rows);
  const result = await verifyTeamCollaboration(log, { evidenceRoot: root });
  assert.equal(result.verifiedActiveUnionMinutes, 480);
  assert.equal(result.roleCount, 6);
  assert.equal(result.status, "PASS");
});

test("rejects wall-clock padding, too few roles, and invalid intervals", async () => {
  const padded = row({
    start: "2026-07-29T00:00:00.000Z",
    minutes: 15,
    role: "产品",
    agent: "agent-1",
    output: "one.md",
  });
  padded.finishedAt = "2026-07-29T08:00:00.000Z";
  const { root, log } = await fixture([padded]);
  await assert.rejects(
    verifyTeamCollaboration(log, { evidenceRoot: root }),
    /COLLAB_ACTIVE_UNION:15<480|COLLAB_ROLE_COUNT:1<6/u,
  );

  const invalid = { ...padded, finishedAt: "2026-07-28T23:59:00.000Z" };
  const invalidFixture = await fixture([invalid]);
  await assert.rejects(
    verifyTeamCollaboration(invalidFixture.log, {
      evidenceRoot: invalidFixture.root,
    }),
    /COLLAB_INTERVAL_INVALID/u,
  );
});

test("rejects missing evidence, overlapping ownership, and unverified playtests", async () => {
  const first = row({
    start: "2026-07-29T00:00:00.000Z",
    minutes: 60,
    role: "测试",
    agent: "agent-a",
    output: "shared.ts",
  });
  const second = row({
    start: "2026-07-29T00:30:00.000Z",
    minutes: 60,
    role: "开发",
    agent: "agent-b",
    output: "shared.ts",
  });
  const overlap = await fixture([first, second]);
  await assert.rejects(
    verifyTeamCollaboration(overlap.log, { evidenceRoot: overlap.root }),
    /COLLAB_OWNERSHIP_OVERLAP:shared\.ts/u,
  );

  const missing = await fixture([
    {
      ...first,
      evidencePath: "missing.json",
      evidenceSha256: "0".repeat(64),
    },
  ]);
  await assert.rejects(
    verifyTeamCollaboration(missing.log, { evidenceRoot: missing.root }),
    /COLLAB_EVIDENCE_MISSING/u,
  );

  const badReportRoot = await mkdtemp(path.join(os.tmpdir(), "h5-playtest-"));
  const badReport = JSON.stringify({
    exitCode: 1,
    summary: { pass: 0, fail: 1 },
  });
  await writeFile(path.join(badReportRoot, "playtest.json"), badReport);
  const badSha = createHash("sha256").update(badReport).digest("hex");
  const playtest = await fixture([
    {
      ...first,
      objective: "完成 AI 试玩验证",
      evidencePath: "playtest.json",
      evidenceSha256: badSha,
    },
  ]);
  await writeFile(
    path.join(playtest.root, "playtest.json"),
    badReport,
  );
  await assert.rejects(
    verifyTeamCollaboration(playtest.log, { evidenceRoot: playtest.root }),
    /COLLAB_PLAYTEST_NOT_VERIFIED/u,
  );
});
