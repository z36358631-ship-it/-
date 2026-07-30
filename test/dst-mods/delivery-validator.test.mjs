import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateCsvHeader,
  validateRules
} from '../../tools/lib/dst-mods-delivery-validator.mjs';

test('validateRules reports missing files and missing contract text', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-validator-'));
  await writeFile(join(root, 'present.md'), '# 标题\n仅此设备\n', 'utf8');

  const errors = await validateRules(root, [
    {
      path: 'present.md',
      required: [/^# 标题$/m, /resolved_launch_manifest/]
    },
    {
      path: 'missing.md',
      required: [/内容/]
    }
  ]);

  assert.deepEqual(errors, [
    'present.md: missing /resolved_launch_manifest/',
    'missing.md: file not found'
  ]);
});

test('validateRules accepts matching UTF-8 content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-validator-'));
  await mkdir(join(root, 'nested'), { recursive: true });
  await writeFile(
    join(root, 'nested', 'contract.md'),
    '# 合同\n仅此设备\nresolved_launch_manifest\n',
    'utf8'
  );

  const errors = await validateRules(root, [
    {
      path: 'nested/contract.md',
      required: [/^# 合同$/m, /仅此设备/, /resolved_launch_manifest/]
    }
  ]);

  assert.deepEqual(errors, []);
});

test('validateCsvHeader compares the exact ordered header', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-validator-'));
  await writeFile(join(root, 'cases.csv'), '用例ID,端,预期结果\nA-001,Mac,通过\n', 'utf8');

  assert.deepEqual(
    await validateCsvHeader(root, 'cases.csv', ['用例ID', '端', '预期结果']),
    []
  );
  assert.deepEqual(
    await validateCsvHeader(root, 'cases.csv', ['用例ID', '平台', '预期结果']),
    ['cases.csv: CSV header mismatch']
  );
});
