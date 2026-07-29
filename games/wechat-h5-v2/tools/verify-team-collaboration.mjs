import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_COLUMNS = [
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

function parseTable(markdown) {
  const lines = markdown
    .split(/\r?\n/u)
    .filter((line) => line.trim().startsWith("|"));
  if (lines.length < 3) throw new Error("COLLAB_TABLE_MISSING");
  const cells = (line) =>
    line.trim().replace(/^\||\|$/gu, "").split("|").map((item) => item.trim());
  const header = cells(lines[0]);
  if (JSON.stringify(header) !== JSON.stringify(EXPECTED_COLUMNS)) {
    throw new Error("COLLAB_COLUMNS_INVALID");
  }
  return lines.slice(2).map((line, index) => {
    const values = cells(line);
    if (values.length !== EXPECTED_COLUMNS.length) {
      throw new Error(`COLLAB_ROW_WIDTH:${index + 1}`);
    }
    return Object.fromEntries(
      EXPECTED_COLUMNS.map((column, cellIndex) => [column, values[cellIndex]]),
    );
  });
}

function unionMinutes(intervals) {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let start = sorted[0].start;
  let end = sorted[0].end;
  let total = 0;
  for (const interval of sorted.slice(1)) {
    if (interval.start <= end) {
      end = Math.max(end, interval.end);
    } else {
      total += end - start;
      start = interval.start;
      end = interval.end;
    }
  }
  total += end - start;
  return Math.round(total / 60_000);
}

function outputs(value) {
  return value
    .split(/[,，;]/u)
    .map((item) => item.trim())
    .filter((item) => item && item !== "-");
}

export async function verifyTeamCollaboration(
  logFile,
  {
    evidenceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."),
    minimumMinutes = 480,
    minimumRoles = 6,
  } = {},
) {
  const markdown = await readFile(logFile, "utf8");
  const rows = parseTable(markdown);
  const verified = [];
  const ownership = new Map();

  for (const [index, row] of rows.entries()) {
    const line = index + 1;
    const start = Date.parse(row.startedAt);
    const finish = Date.parse(row.finishedAt);
    const activeMinutes = Number(row.activeMinutes);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(finish) ||
      finish < start ||
      !Number.isFinite(activeMinutes) ||
      activeMinutes <= 0 ||
      activeMinutes * 60_000 > finish - start
    ) {
      throw new Error(`COLLAB_INTERVAL_INVALID:${line}`);
    }
    if (
      !row.evidencePath ||
      row.evidencePath === "-" ||
      path.isAbsolute(row.evidencePath) ||
      row.evidencePath.includes("\\") ||
      row.evidencePath.split("/").includes("..")
    ) {
      throw new Error(`COLLAB_EVIDENCE_PATH_INVALID:${line}`);
    }
    if (!/^[a-f0-9]{64}$/u.test(row.evidenceSha256)) {
      throw new Error(`COLLAB_EVIDENCE_HASH_INVALID:${line}`);
    }
    const evidenceFile = path.resolve(evidenceRoot, row.evidencePath);
    let evidence;
    try {
      evidence = await readFile(evidenceFile);
    } catch {
      throw new Error(`COLLAB_EVIDENCE_MISSING:${line}:${row.evidencePath}`);
    }
    const hash = createHash("sha256").update(evidence).digest("hex");
    if (hash !== row.evidenceSha256) {
      throw new Error(`COLLAB_EVIDENCE_HASH_MISMATCH:${line}`);
    }
    if (/试玩|playtest/iu.test(`${row.objective} ${row.output}`)) {
      let report;
      try {
        report = JSON.parse(evidence.toString("utf8"));
      } catch {
        throw new Error(`COLLAB_PLAYTEST_NOT_VERIFIED:${line}`);
      }
      if (
        report.exitCode !== 0 ||
        Number(report.summary?.fail ?? 1) !== 0
      ) {
        throw new Error(`COLLAB_PLAYTEST_NOT_VERIFIED:${line}`);
      }
    }

    const interval = {
      start,
      finish,
      end: start + activeMinutes * 60_000,
      activeMinutes,
      agent: row["agent/task"],
      objective: row.objective,
    };
    for (const output of outputs(row.output)) {
      const previous = ownership.get(output) ?? [];
      for (const item of previous) {
        const overlaps = start < item.finish && item.start < finish;
        const handedOff = /HANDOFF:/u.test(row.objective) ||
          /HANDOFF:/u.test(item.objective);
        if (overlaps && item.agent !== interval.agent && !handedOff) {
          throw new Error(`COLLAB_OWNERSHIP_OVERLAP:${output}`);
        }
      }
      previous.push(interval);
      ownership.set(output, previous);
    }
    verified.push({ ...interval, role: row.role });
  }

  const verifiedActiveUnionMinutes = unionMinutes(verified);
  const roleCount = new Set(verified.map((row) => row.role)).size;
  const earliest = Math.min(...verified.map((row) => row.start));
  const latest = Math.max(...verified.map((row) => row.finish));
  const wallClockMinutes = verified.length
    ? Math.round((latest - earliest) / 60_000)
    : 0;
  const metrics =
    `wallClockMinutes=${wallClockMinutes} · verifiedActiveUnionMinutes=${verifiedActiveUnionMinutes} · roleCount=${roleCount} · evidenceRows=${verified.length} · invalidRows=0`;
  if (verifiedActiveUnionMinutes < minimumMinutes) {
    throw new Error(
      `COLLAB_ACTIVE_UNION:${verifiedActiveUnionMinutes}<${minimumMinutes} · ${metrics}`,
    );
  }
  if (roleCount < minimumRoles) {
    throw new Error(
      `COLLAB_ROLE_COUNT:${roleCount}<${minimumRoles} · ${metrics}`,
    );
  }
  return {
    status: "PASS",
    wallClockMinutes,
    verifiedActiveUnionMinutes,
    roleCount,
    evidenceRows: verified.length,
    invalidRows: 0,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const logFile = process.argv[2];
    if (!logFile) throw new Error("COLLAB_LOG_ARGUMENT_REQUIRED");
    const result = await verifyTeamCollaboration(path.resolve(logFile));
    process.stdout.write(
      `COLLABORATION PASS · ${result.verifiedActiveUnionMinutes} active union minutes · ${result.roleCount} roles · ${result.evidenceRows} evidence rows\n`,
    );
  } catch (error) {
    process.stderr.write(
      `COLLABORATION FAIL · ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
