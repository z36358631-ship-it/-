import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const migration = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  external_wait TEXT NOT NULL DEFAULT '无外部等待',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  UNIQUE(requirement_id, path)
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
  thread_id TEXT,
  turn_id TEXT,
  prompt TEXT NOT NULL,
  cwd TEXT NOT NULL,
  process_pid INTEGER,
  permission TEXT NOT NULL CHECK(permission IN ('read-only','generate-candidate','modify-existing')),
  status TEXT NOT NULL CHECK(status IN ('queued','running','waiting-approval','completed','failed','cancelled','interrupted')),
  result TEXT,
  error TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(run_id, sequence)
);
CREATE TABLE IF NOT EXISTS run_contexts (
  run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  files_json TEXT NOT NULL,
  input_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS manual_tasks (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  assignee_note TEXT NOT NULL,
  description TEXT NOT NULL,
  due_at TEXT,
  expected_deliverable TEXT NOT NULL,
  current_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('待开始','进行中','已完成')),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_events_run_sequence ON run_events(run_id, sequence);
`;

function now() {
  return new Date().toISOString();
}

export function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(migration);
  db.prepare(
    `UPDATE runs SET status = 'interrupted', error = ?, finished_at = ?
     WHERE status IN ('queued', 'running')`,
  ).run('Broker restarted before the run completed', now());

  return {
    upsertRequirement(value) {
      db.prepare(
        `INSERT INTO requirements(id,title,stage,external_wait,updated_at)
         VALUES(?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           title=excluded.title, stage=excluded.stage,
           external_wait=excluded.external_wait, updated_at=excluded.updated_at`,
      ).run(value.id, value.title, value.stage, value.externalWait || '无外部等待', now());
    },
    listRequirements() {
      return db.prepare(
        `SELECT id,title,stage,external_wait AS externalWait,updated_at AS updatedAt
         FROM requirements ORDER BY updated_at DESC`,
      ).all();
    },
    getRequirement(requirementId) {
      return db.prepare(
        `SELECT id,title,stage,external_wait AS externalWait,updated_at AS updatedAt
         FROM requirements WHERE id=?`,
      ).get(requirementId);
    },
    addArtifact(value) {
      db.prepare(
        `INSERT INTO artifacts(id,requirement_id,kind,path) VALUES(?,?,?,?)
         ON CONFLICT(requirement_id,path) DO UPDATE SET kind=excluded.kind`,
      ).run(value.id, value.requirementId, value.kind, value.path);
    },
    listArtifacts(requirementId = null) {
      return requirementId
        ? db.prepare(
            `SELECT id,requirement_id AS requirementId,kind,path
             FROM artifacts WHERE requirement_id=? ORDER BY kind,path`,
          ).all(requirementId)
        : db.prepare(
            `SELECT id,requirement_id AS requirementId,kind,path
             FROM artifacts ORDER BY requirement_id,kind,path`,
          ).all();
    },
    createRun(value) {
      db.prepare(
        `INSERT INTO runs(id,requirement_id,prompt,cwd,process_pid,permission,status,started_at)
         VALUES(?,?,?,?,?,?,?,?)`,
      ).run(
        value.id,
        value.requirementId,
        value.prompt,
        value.cwd || process.cwd(),
        value.processPid || null,
        value.permission,
        value.status,
        now(),
      );
    },
    saveRunContext(runId, { files = [], input = {} }) {
      db.prepare(
        `INSERT INTO run_contexts(run_id,files_json,input_json) VALUES(?,?,?)
         ON CONFLICT(run_id) DO UPDATE SET
           files_json=excluded.files_json,input_json=excluded.input_json`,
      ).run(runId, JSON.stringify(files), JSON.stringify(input));
    },
    getRunContext(runId) {
      const row = db.prepare(
        `SELECT files_json AS filesJson,input_json AS inputJson
         FROM run_contexts WHERE run_id=?`,
      ).get(runId);
      return row ? { files: JSON.parse(row.filesJson), input: JSON.parse(row.inputJson) } : null;
    },
    bindProtocolIds(runId, threadId, turnId = null, processPid = null) {
      db.prepare(`UPDATE runs SET thread_id=?,turn_id=?,process_pid=? WHERE id=?`)
        .run(threadId, turnId, processPid, runId);
    },
    appendRunEvent(runId, type, payload) {
      db.prepare(
        `INSERT INTO run_events(run_id,sequence,type,payload_json,created_at)
         SELECT ?,COALESCE(MAX(sequence),0)+1,?,?,? FROM run_events WHERE run_id=?`,
      ).run(runId, type, JSON.stringify(payload), now(), runId);
    },
    finishRun(runId, status, result = null, error = null) {
      db.prepare(
        `UPDATE runs SET status=?,result=?,error=?,finished_at=? WHERE id=?`,
      ).run(status, result, error, now(), runId);
    },
    getRun(runId) {
      return db.prepare(
        `SELECT id,requirement_id AS requirementId,thread_id AS threadId,turn_id AS turnId,
                prompt,cwd,process_pid AS processPid,permission,status,result,error,
                started_at AS startedAt,finished_at AS finishedAt
         FROM runs WHERE id=?`,
      ).get(runId);
    },
    listRuns(limit = 30) {
      return db.prepare(
        `SELECT id,requirement_id AS requirementId,thread_id AS threadId,turn_id AS turnId,
                prompt,cwd,process_pid AS processPid,permission,status,result,error,
                started_at AS startedAt,finished_at AS finishedAt
         FROM runs ORDER BY started_at DESC LIMIT ?`,
      ).all(limit);
    },
    countActiveRuns() {
      return db.prepare(
        `SELECT COUNT(*) AS count FROM runs WHERE status IN ('queued','running','waiting-approval')`,
      ).get().count;
    },
    listRunEvents(runId, after = 0) {
      return db.prepare(
        `SELECT sequence,type,payload_json AS payloadJson,created_at AS createdAt
         FROM run_events WHERE run_id=? AND sequence>? ORDER BY sequence`,
      ).all(runId, after).map(row => ({ ...row, payload: JSON.parse(row.payloadJson) }));
    },
    upsertManualTask(value) {
      db.prepare(
        `INSERT INTO manual_tasks
         (id,requirement_id,assignee_note,description,due_at,expected_deliverable,current_note,status,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           assignee_note=excluded.assignee_note,description=excluded.description,
           due_at=excluded.due_at,expected_deliverable=excluded.expected_deliverable,
           current_note=excluded.current_note,status=excluded.status,updated_at=excluded.updated_at`,
      ).run(
        value.id,
        value.requirementId,
        value.assigneeNote,
        value.description,
        value.dueAt || null,
        value.expectedDeliverable,
        value.currentNote || '',
        value.status,
        now(),
      );
    },
    listManualTasks(requirementId = null) {
      return requirementId
        ? db.prepare(
            `SELECT id,requirement_id AS requirementId,assignee_note AS assigneeNote,
                    description,due_at AS dueAt,expected_deliverable AS expectedDeliverable,
                    current_note AS currentNote,status,updated_at AS updatedAt
             FROM manual_tasks WHERE requirement_id=? ORDER BY updated_at DESC`,
          ).all(requirementId)
        : db.prepare(
            `SELECT id,requirement_id AS requirementId,assignee_note AS assigneeNote,
                    description,due_at AS dueAt,expected_deliverable AS expectedDeliverable,
                    current_note AS currentNote,status,updated_at AS updatedAt
             FROM manual_tasks ORDER BY updated_at DESC`,
          ).all();
    },
    getManualTask(id) {
      return db.prepare(
        `SELECT id,requirement_id AS requirementId,assignee_note AS assigneeNote,
                description,due_at AS dueAt,expected_deliverable AS expectedDeliverable,
                current_note AS currentNote,status,updated_at AS updatedAt
         FROM manual_tasks WHERE id=?`,
      ).get(id);
    },
    close() {
      db.close();
    },
  };
}
