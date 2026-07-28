import crypto from 'node:crypto';
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
CREATE TABLE IF NOT EXISTS requirement_threads (
  requirement_id TEXT PRIMARY KEY REFERENCES requirements(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workflow_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK(workflow_type IN ('feedback-triage','demo-prd-review','issue-strategy')),
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS requirement_candidates (
  id TEXT PRIMARY KEY,
  workflow_result_id TEXT NOT NULL REFERENCES workflow_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  evidence TEXT NOT NULL,
  matched_requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
  suggested_priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待确认'
);
CREATE TABLE IF NOT EXISTS review_findings (
  id TEXT PRIMARY KEY,
  workflow_result_id TEXT NOT NULL REFERENCES workflow_results(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  severity TEXT NOT NULL,
  impact TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待确认'
);
CREATE TABLE IF NOT EXISTS product_strategies (
  id TEXT PRIMARY KEY,
  workflow_result_id TEXT NOT NULL REFERENCES workflow_results(id) ON DELETE CASCADE,
  essence TEXT NOT NULL,
  main_flow TEXT NOT NULL,
  exception_policy TEXT NOT NULL,
  boundary_policy TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL,
  feishu_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待确认'
);
CREATE TABLE IF NOT EXISTS file_snapshots (
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  existed INTEGER NOT NULL CHECK(existed IN (0,1)),
  content_base64 TEXT,
  hash TEXT,
  PRIMARY KEY(run_id,path)
);
CREATE TABLE IF NOT EXISTS file_changes (
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('created','modified','deleted')),
  before_hash TEXT,
  after_hash TEXT,
  diff TEXT NOT NULL,
  restored_at TEXT,
  PRIMARY KEY(run_id,path)
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  protocol_request_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('passed','failed','skipped')),
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS run_apply_states (
  run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK(state IN ('not-started','applying','applied')),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_events_run_sequence ON run_events(run_id, sequence);
CREATE INDEX IF NOT EXISTS idx_approvals_run_status_created
  ON approvals(run_id,status,created_at);
`;

function now() {
  return new Date().toISOString();
}

function assertFileSafetyRunsSchema(db) {
  const runsSql = String(db.prepare(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='runs'`,
  ).get()?.sql || '');
  if (!runsSql) return;
  for (const requiredToken of ['generate-candidate', 'modify-existing', 'waiting-approval']) {
    if (!runsSql.includes(requiredToken)) {
      throw new Error(
        `Database runs schema is older than the file-safety plan: missing ${requiredToken}`,
      );
    }
  }
}

function parseStoredJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON stored for ${label}`, { cause: error });
  }
}

function stringifyJson(value, label) {
  try {
    const result = JSON.stringify(value);
    if (result === undefined) throw new TypeError('value serializes to undefined');
    return result;
  } catch (error) {
    throw new TypeError(`${label} must be JSON-serializable`, { cause: error });
  }
}

export function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  try {
    assertFileSafetyRunsSchema(db);
    db.exec(migration);
    assertFileSafetyRunsSchema(db);
    const runColumns = db.prepare(`PRAGMA table_info(runs)`).all().map(row => row.name);
    if (!runColumns.includes('workflow_type')) {
      db.exec(`ALTER TABLE runs ADD COLUMN workflow_type TEXT`);
    }
  } catch (error) {
    db.close();
    throw error;
  }
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
    removeArtifact(requirementId, artifactPath) {
      const result = db.prepare(
        `DELETE FROM artifacts WHERE requirement_id=? AND path=?`,
      ).run(requirementId, artifactPath);
      return Number(result.changes) > 0;
    },
    bindRequirementThread(requirementId, threadId) {
      const timestamp = now();
      db.prepare(
        `INSERT INTO requirement_threads(requirement_id,thread_id,created_at,last_used_at)
         VALUES(?,?,?,?)`,
      ).run(requirementId, threadId, timestamp, timestamp);
    },
    touchRequirementThread(requirementId) {
      db.prepare(
        `UPDATE requirement_threads SET last_used_at=? WHERE requirement_id=?`,
      ).run(now(), requirementId);
    },
    replaceRequirementThread(requirementId, threadId) {
      const timestamp = now();
      db.prepare(
        `UPDATE requirement_threads
         SET thread_id=?,created_at=?,last_used_at=? WHERE requirement_id=?`,
      ).run(threadId, timestamp, timestamp, requirementId);
    },
    getRequirementThread(requirementId) {
      return db.prepare(
        `SELECT requirement_id AS requirementId,thread_id AS threadId,
                created_at AS createdAt,last_used_at AS lastUsedAt
         FROM requirement_threads WHERE requirement_id=?`,
      ).get(requirementId);
    },
    createRun(value) {
      db.prepare(
        `INSERT INTO runs
         (id,requirement_id,prompt,cwd,process_pid,permission,status,workflow_type,started_at)
         VALUES(?,?,?,?,?,?,?,?,?)`,
      ).run(
        value.id,
        value.requirementId,
        value.prompt,
        value.cwd || process.cwd(),
        value.processPid || null,
        value.permission,
        value.status,
        value.workflowType || null,
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
      return row
        ? {
            files: parseStoredJson(row.filesJson, `run ${runId} context files`),
            input: parseStoredJson(row.inputJson, `run ${runId} context input`),
          }
        : null;
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
    setRunStatus(runId, status) {
      const result = db.prepare(`UPDATE runs SET status=? WHERE id=?`).run(status, runId);
      return Number(result.changes) > 0;
    },
    getRun(runId) {
      return db.prepare(
        `SELECT id,requirement_id AS requirementId,thread_id AS threadId,turn_id AS turnId,
                prompt,cwd,process_pid AS processPid,permission,status,
                workflow_type AS workflowType,result,error,
                started_at AS startedAt,finished_at AS finishedAt
         FROM runs WHERE id=?`,
      ).get(runId);
    },
    listRuns(limit = 30) {
      return db.prepare(
        `SELECT id,requirement_id AS requirementId,thread_id AS threadId,turn_id AS turnId,
                prompt,cwd,process_pid AS processPid,permission,status,
                workflow_type AS workflowType,result,error,
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
      ).all(runId, after).map(row => ({
        ...row,
        payload: parseStoredJson(
          row.payloadJson,
          `run ${runId} event ${row.sequence} payload`,
        ),
      }));
    },
    setRunApplyState(runId, state) {
      db.prepare(
        `INSERT INTO run_apply_states(run_id,state,updated_at) VALUES(?,?,?)
         ON CONFLICT(run_id) DO UPDATE SET
           state=excluded.state,updated_at=excluded.updated_at`,
      ).run(runId, state, now());
    },
    getRunApplyState(runId) {
      return db.prepare(
        `SELECT state,updated_at AS updatedAt FROM run_apply_states WHERE run_id=?`,
      ).get(runId) || { state: 'not-started', updatedAt: null };
    },
    saveFileSnapshot(runId, value) {
      db.prepare(
        `INSERT INTO file_snapshots
         (run_id,path,absolute_path,existed,content_base64,hash)
         VALUES(?,?,?,?,?,?)
         ON CONFLICT(run_id,path) DO UPDATE SET
           absolute_path=excluded.absolute_path,
           existed=excluded.existed,
           content_base64=excluded.content_base64,
           hash=excluded.hash`,
      ).run(
        runId,
        value.path,
        value.absolutePath,
        value.existed ? 1 : 0,
        value.contentBase64 ?? null,
        value.hash ?? null,
      );
    },
    listFileSnapshots(runId) {
      return db.prepare(
        `SELECT path,absolute_path AS absolutePath,existed,
                content_base64 AS contentBase64,hash
         FROM file_snapshots WHERE run_id=? ORDER BY path`,
      ).all(runId).map(row => ({ ...row, existed: Boolean(row.existed) }));
    },
    saveFileChange(runId, value) {
      db.prepare(
        `INSERT INTO file_changes
         (run_id,path,absolute_path,kind,before_hash,after_hash,diff)
         VALUES(?,?,?,?,?,?,?)
         ON CONFLICT(run_id,path) DO UPDATE SET
           absolute_path=excluded.absolute_path,
           kind=excluded.kind,
           before_hash=excluded.before_hash,
           after_hash=excluded.after_hash,
           diff=excluded.diff,
           restored_at=NULL`,
      ).run(
        runId,
        value.path,
        value.absolutePath,
        value.kind,
        value.beforeHash ?? null,
        value.afterHash ?? null,
        value.diff,
      );
    },
    listFileChanges(runId) {
      return db.prepare(
        `SELECT path,absolute_path AS absolutePath,kind,
                before_hash AS beforeHash,after_hash AS afterHash,
                diff,restored_at AS restoredAt
         FROM file_changes WHERE run_id=? ORDER BY path`,
      ).all(runId);
    },
    markChangesRestored(runId) {
      const result = db.prepare(
        `UPDATE file_changes SET restored_at=? WHERE run_id=?`,
      ).run(now(), runId);
      return Number(result.changes);
    },
    markFileChangeRestored(runId, filePath) {
      const result = db.prepare(
        `UPDATE file_changes SET restored_at=?
         WHERE run_id=? AND path=? AND restored_at IS NULL`,
      ).run(now(), runId, filePath);
      return Number(result.changes) === 1;
    },
    createApproval(value) {
      const payloadJson = stringifyJson(value.payload, 'Approval payload');
      db.prepare(
        `INSERT INTO approvals
         (id,run_id,protocol_request_id,kind,summary,payload_json,status,created_at)
         VALUES(?,?,?,?,?,?,'pending',?)`,
      ).run(
        value.id,
        value.runId,
        String(value.protocolRequestId),
        value.kind,
        value.summary,
        payloadJson,
        now(),
      );
    },
    getApproval(id) {
      const row = db.prepare(
        `SELECT id,run_id AS runId,protocol_request_id AS protocolRequestId,
                kind,summary,payload_json AS payloadJson,status,
                created_at AS createdAt,resolved_at AS resolvedAt
         FROM approvals WHERE id=?`,
      ).get(id);
      return row
        ? {
            ...row,
            payload: parseStoredJson(row.payloadJson, `approval ${row.id} payload`),
          }
        : null;
    },
    listPendingApprovals(runId) {
      return db.prepare(
        `SELECT id,run_id AS runId,protocol_request_id AS protocolRequestId,
                kind,summary,payload_json AS payloadJson,status,
                created_at AS createdAt,resolved_at AS resolvedAt
         FROM approvals
         WHERE run_id=? AND status='pending'
         ORDER BY created_at,id`,
      ).all(runId).map(row => ({
        ...row,
        payload: parseStoredJson(row.payloadJson, `approval ${row.id} payload`),
      }));
    },
    listApprovals(runId) {
      return db.prepare(
        `SELECT id,run_id AS runId,protocol_request_id AS protocolRequestId,
                kind,summary,payload_json AS payloadJson,status,
                created_at AS createdAt,resolved_at AS resolvedAt
         FROM approvals WHERE run_id=? ORDER BY created_at,id`,
      ).all(runId).map(row => ({
        ...row,
        payload: parseStoredJson(row.payloadJson, `approval ${row.id} payload`),
      }));
    },
    resolveApproval(id, status) {
      if (!['approved', 'rejected'].includes(status)) {
        throw new Error('Approval resolution status must be approved or rejected');
      }
      const result = db.prepare(
        `UPDATE approvals SET status=?,resolved_at=?
         WHERE id=? AND status='pending'`,
      ).run(status, now(), id);
      return Number(result.changes) === 1;
    },
    saveValidation(runId, value) {
      db.prepare(
        `INSERT INTO validations(run_id,name,status,detail,created_at)
         VALUES(?,?,?,?,?)`,
      ).run(runId, value.name, value.status, value.detail, now());
    },
    listValidations(runId) {
      return db.prepare(
        `SELECT name,status,detail,created_at AS createdAt
         FROM validations WHERE run_id=? ORDER BY id`,
      ).all(runId);
    },
    saveWorkflowResult(value) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(
          `INSERT INTO workflow_results
           (id,run_id,requirement_id,workflow_type,result_json,created_at)
           VALUES(?,?,?,?,?,?)`,
        ).run(
          value.id,
          value.runId,
          value.requirementId,
          value.workflowType,
          JSON.stringify(value.result),
          now(),
        );
        if (value.workflowType === 'feedback-triage') {
          const insert = db.prepare(
            `INSERT INTO requirement_candidates
             (id,workflow_result_id,title,evidence,matched_requirement_id,suggested_priority)
             VALUES(?,?,?,?,?,?)`,
          );
          for (const candidate of value.result.candidates) {
            insert.run(
              crypto.randomUUID(),
              value.id,
              candidate.title,
              candidate.evidence,
              candidate.matchedRequirementId || null,
              candidate.suggestedPriority,
            );
          }
        }
        if (value.workflowType === 'demo-prd-review') {
          const insert = db.prepare(
            `INSERT INTO review_findings
             (id,workflow_result_id,category,location,severity,impact,recommendation)
             VALUES(?,?,?,?,?,?,?)`,
          );
          for (const finding of value.result.findings) {
            insert.run(
              crypto.randomUUID(),
              value.id,
              finding.category,
              finding.location,
              finding.severity,
              finding.impact,
              finding.recommendation,
            );
          }
        }
        if (value.workflowType === 'issue-strategy') {
          db.prepare(
            `INSERT INTO product_strategies
             (id,workflow_result_id,essence,main_flow,exception_policy,boundary_policy,
              acceptance_criteria,feishu_summary)
             VALUES(?,?,?,?,?,?,?,?)`,
          ).run(
            crypto.randomUUID(),
            value.id,
            value.result.essence,
            value.result.mainFlow,
            value.result.exceptionPolicy,
            value.result.boundaryPolicy,
            JSON.stringify(value.result.acceptanceCriteria),
            value.result.feishuSummary,
          );
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    getWorkflowResult(runId) {
      const row = db.prepare(
        `SELECT id,run_id AS runId,requirement_id AS requirementId,
                workflow_type AS workflowType,result_json AS resultJson,created_at AS createdAt
         FROM workflow_results WHERE run_id=?`,
      ).get(runId);
      return row
        ? {
            ...row,
            result: parseStoredJson(row.resultJson, `workflow result ${row.id}`),
          }
        : null;
    },
    listRequirementCandidates() {
      return db.prepare(
        `SELECT c.id,r.requirement_id AS requirementId,c.title,c.evidence,
                c.matched_requirement_id AS matchedRequirementId,
                c.suggested_priority AS suggestedPriority,c.status
         FROM requirement_candidates c
         JOIN workflow_results r ON r.id=c.workflow_result_id
         ORDER BY r.created_at DESC,c.title`,
      ).all();
    },
    listReviewFindings() {
      return db.prepare(
        `SELECT f.id,r.requirement_id AS requirementId,f.category,f.location,
                f.severity,f.impact,f.recommendation,f.status
         FROM review_findings f
         JOIN workflow_results r ON r.id=f.workflow_result_id
         ORDER BY r.created_at DESC,f.id`,
      ).all();
    },
    listProductStrategies() {
      return db.prepare(
        `SELECT s.id,r.requirement_id AS requirementId,s.essence,
                s.main_flow AS mainFlow,s.exception_policy AS exceptionPolicy,
                s.boundary_policy AS boundaryPolicy,
                s.acceptance_criteria AS acceptanceCriteriaJson,
                s.feishu_summary AS feishuSummary,s.status
         FROM product_strategies s
         JOIN workflow_results r ON r.id=s.workflow_result_id
         ORDER BY r.created_at DESC`,
      ).all().map(row => ({
        ...row,
        acceptanceCriteria: parseStoredJson(
          row.acceptanceCriteriaJson,
          `product strategy ${row.id} acceptance criteria`,
        ),
      }));
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
