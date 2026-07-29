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
