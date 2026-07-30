import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateStandaloneDemo,
  validateSharedContract
} from '../../tools/lib/dst-mods-demo-validator.mjs';

test('standalone demo rejects external resources and old scope', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-demo-'));
  const file = join(root, 'old.html');
  await writeFile(
    file,
    '<link href="https://cdn.example/x.css"><h1>GTA 5 Mod中心</h1>',
    'utf8'
  );
  const errors = await validateStandaloneDemo(file);
  assert(errors.some(error => error.includes('external resource')));
  assert(errors.some(error => error.includes('old scope')));
});

test('standalone demo accepts an offline DST contract', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-demo-'));
  const file = join(root, 'ok.html');
  await writeFile(
    file,
    `<!doctype html><title>DST MODS</title>
     <script>
       const DEMO_MODEL_VERSION='dst_mods_demo_v1';
       const GAME_ID='steam:322330';
       const device_installation_id='device-app-01';
       const task_id='task-01';
       const source_unknown='source_unknown';
       const paused_by_system='paused_by_system';
       const loaded_match='loaded_match';
       window.__DST_MODS_DEMO__={version:DEMO_MODEL_VERSION};
     </script>`,
    'utf8'
  );
  assert.deepEqual(await validateStandaloneDemo(file), []);
});

test('three demos must expose the same model version', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-demo-'));
  const files = [];
  for (const [name, version] of [['a.html', 'v1'], ['b.html', 'v1'], ['c.html', 'v2']]) {
    const file = join(root, name);
    await writeFile(file, `const DEMO_MODEL_VERSION='${version}';`, 'utf8');
    files.push(file);
  }
  assert.deepEqual(
    await validateSharedContract(files),
    ['model version mismatch: v1, v1, v2']
  );
});
