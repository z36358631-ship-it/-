import path from "node:path";

export const FORMAL_EVIDENCE_PATHS = Object.freeze({
  sessionEvidencePath: "session-evidence.json",
  entryScreenshotPath: "entry.png",
  actionLogPath: "session-actions.jsonl",
  tracePath: "session-trace.zip",
});

export function referencedEvidencePaths(report) {
  if (report === null || typeof report !== "object" || Array.isArray(report)) {
    return [];
  }
  const runs = Array.isArray(report.runs) ? report.runs : [];
  return [...new Set([
    report.sessionEvidencePath,
    report.entryScreenshotPath,
    report.actionLogPath,
    report.tracePath,
    ...runs.flatMap((run) => (
      run !== null
      && typeof run === "object"
      && !Array.isArray(run)
        ? [
            ...(Array.isArray(run.screenshotPaths)
              ? run.screenshotPaths
              : []),
            run.eventLogPath,
          ]
        : []
    )),
  ].filter((value) => typeof value === "string" && value.length > 0))];
}

function packagePathSize(sizeByPackagePath, packagePath) {
  if (sizeByPackagePath instanceof Map) {
    return sizeByPackagePath.get(packagePath);
  }
  if (
    sizeByPackagePath !== null
    && typeof sizeByPackagePath === "object"
    && Object.hasOwn(sizeByPackagePath, packagePath)
  ) {
    return sizeByPackagePath[packagePath];
  }
  return undefined;
}

export function assertReferencedTraceLimits({
  reports,
  sizeByPackagePath,
  maxTraceBytes = 134217728,
  maxTotalTraceBytes = 1073741824,
}) {
  if (!Array.isArray(reports)) {
    throw new Error("PLAYTEST_TRACE_REPORTS_INVALID");
  }
  const tracePackagePaths = new Set();
  for (const entry of reports) {
    const reportPath = entry?.reportPath;
    const report = entry?.report;
    const traceReferences = referencedEvidencePaths(report)
      .filter((evidencePath) => evidencePath === FORMAL_EVIDENCE_PATHS.tracePath);
    if (
      typeof reportPath !== "string"
      || reportPath.length === 0
      || report?.tracePath !== FORMAL_EVIDENCE_PATHS.tracePath
      || traceReferences.length !== 1
    ) {
      throw new Error(`PLAYTEST_TRACE_REFERENCE_COUNT:${reportPath ?? "MISSING"}`);
    }
    tracePackagePaths.add(path.posix.join(
      path.posix.dirname(reportPath),
      FORMAL_EVIDENCE_PATHS.tracePath,
    ));
  }

  let totalTraceBytes = 0;
  for (const tracePackagePath of tracePackagePaths) {
    const traceBytes = packagePathSize(sizeByPackagePath, tracePackagePath);
    if (traceBytes === undefined) {
      throw new Error(`PLAYTEST_TRACE_SIZE_MISSING:${tracePackagePath}`);
    }
    if (!Number.isSafeInteger(traceBytes) || traceBytes < 0) {
      throw new Error(`PLAYTEST_TRACE_SIZE_INVALID:${tracePackagePath}:${traceBytes}`);
    }
    if (traceBytes > maxTraceBytes) {
      throw new Error(`PLAYTEST_TRACE_TOO_LARGE:${tracePackagePath}:${traceBytes}`);
    }
    totalTraceBytes += traceBytes;
    if (totalTraceBytes > maxTotalTraceBytes) {
      throw new Error(`PLAYTEST_TRACE_TOTAL_TOO_LARGE:${totalTraceBytes}`);
    }
  }

  return {
    traceCount: tracePackagePaths.size,
    totalTraceBytes,
  };
}
