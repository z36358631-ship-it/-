import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorkflowPrompt,
  parseWorkflowResult,
  validateWorkflowInput,
  workflowCatalog,
} from '../../workbench/lib/workflow-catalog.mjs';

const feedbackResult = {
  themes: [{ name: '启动失败', count: 1 }],
  duplicates: [{ merged: '启动失败', sources: ['无法启动'] }],
  existingMatches: [{
    candidate: '启动失败修复入口',
    requirementId: 'REQ-001',
    reason: '属于现有稳定性需求',
  }],
  candidates: [{
    title: '启动失败修复入口',
    evidence: '1条反馈',
    matchedRequirementId: null,
    suggestedPriority: 'P1',
  }],
  informationGaps: ['缺少设备型号'],
};

const reviewResult = {
  summary: '发现一项异常流遗漏',
  findings: [{
    category: '异常',
    location: 'Demo 提交按钮',
    severity: '严重',
    impact: '失败后无法恢复',
    recommendation: '补充失败态和重试入口',
  }],
};

const strategyResult = {
  essence: '失败恢复路径缺失',
  mainFlow: '提交后展示进度',
  exceptionPolicy: '失败可原地重试',
  boundaryPolicy: '不得重复扣费',
  documentLocations: ['PRD 4.2 异常流程'],
  acceptanceCriteria: ['失败原因可见', '重试不重复扣费'],
  feishuSummary: '补齐提交失败恢复闭环',
};

function assertStrictSchema(schema, location = '$') {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.includes('object')) {
    assert.equal(schema.additionalProperties, false, `${location} must reject extra fields`);
    assert.deepEqual(
      [...schema.required].sort(),
      Object.keys(schema.properties).sort(),
      `${location} must require every property`,
    );
    for (const [name, property] of Object.entries(schema.properties)) {
      assertStrictSchema(property, `${location}.${name}`);
    }
  }
  if (types.includes('array')) {
    assert.equal(typeof schema.items, 'object', `${location} must define array items`);
    assertStrictSchema(schema.items, `${location}[]`);
  }
}

test('catalog exposes exactly three frozen read-only workflows with strict output schemas', () => {
  assert.deepEqual(Object.keys(workflowCatalog), [
    'feedback-triage',
    'demo-prd-review',
    'issue-strategy',
  ]);
  for (const workflow of Object.values(workflowCatalog)) {
    assert.equal(workflow.permission, 'read-only');
    assert.equal(Object.isFrozen(workflow), true);
    assert.equal(Object.isFrozen(workflow.outputSchema), true);
    assertStrictSchema(workflow.outputSchema);
  }
  assert.deepEqual(
    workflowCatalog['feedback-triage']
      .outputSchema.properties.candidates.items.properties.suggestedPriority.enum,
    ['P0', 'P1', 'P2', 'P3'],
  );
  assert.deepEqual(
    workflowCatalog['demo-prd-review']
      .outputSchema.properties.findings.items.properties.severity.enum,
    ['致命', '严重', '一般', '建议'],
  );
});

test('input validation is own-property based and prompts embed the output schema', () => {
  assert.throws(() => validateWorkflowInput('feedback-triage', {}), /feedbackText/);
  assert.throws(
    () => validateWorkflowInput('feedback-triage', Object.create({ feedbackText: '继承值' })),
    /feedbackText/,
  );
  assert.throws(
    () => validateWorkflowInput('demo-prd-review', {}, [{ kind: 'Demo' }]),
    /PRD artifact/,
  );
  assert.throws(() => validateWorkflowInput('toString', {}), /Unknown workflow/);
  assert.throws(() => validateWorkflowInput('__proto__', {}), /Unknown workflow/);

  const prompt = buildWorkflowPrompt('feedback-triage', {
    requirement: { id: 'REQ-001', title: '需求池', stage: '待分析' },
    files: [],
    input: { feedbackText: '启动失败，希望增加修复入口' },
  });
  assert.match(prompt, /合并重复表达/);
  assert.match(prompt, /"additionalProperties": false/);
  assert.match(prompt, /"suggestedPriority"/);
});

test('parser accepts complete pure or exactly fenced JSON for all workflows', () => {
  const feedback = parseWorkflowResult(
    'feedback-triage',
    `\`\`\`json\n${JSON.stringify(feedbackResult)}\n\`\`\``,
  );
  assert.equal(feedback.candidates[0].suggestedPriority, 'P1');
  assert.equal(
    parseWorkflowResult('demo-prd-review', JSON.stringify(reviewResult)).findings[0].severity,
    '严重',
  );
  assert.deepEqual(
    parseWorkflowResult('issue-strategy', JSON.stringify(strategyResult)).acceptanceCriteria,
    ['失败原因可见', '重试不重复扣费'],
  );
});

test('parser rejects null, missing or extra fields and prototype-shaped workflow names', () => {
  assert.throws(() => parseWorkflowResult('feedback-triage', 'null'), /object/);
  assert.throws(
    () => parseWorkflowResult(
      'demo-prd-review',
      JSON.stringify({ findings: reviewResult.findings }),
    ),
    /summary/,
  );
  assert.throws(
    () => parseWorkflowResult(
      'issue-strategy',
      JSON.stringify({ ...strategyResult, mainFlow: undefined }),
    ),
    /mainFlow/,
  );
  assert.throws(
    () => parseWorkflowResult(
      'feedback-triage',
      JSON.stringify({ ...feedbackResult, unexpected: true }),
    ),
    /unexpected.*not allowed/,
  );
  const prototypePayload = `${JSON.stringify(feedbackResult).slice(0, -1)},`
    + '"__proto__":{"polluted":true}}';
  assert.throws(
    () => parseWorkflowResult('feedback-triage', prototypePayload),
    /__proto__.*not allowed/,
  );
  assert.equal({}.polluted, undefined);
  assert.throws(
    () => parseWorkflowResult('constructor', JSON.stringify(feedbackResult)),
    /Unknown workflow/,
  );
});

test('parser validates nested types, enums, array items and nested extra fields', () => {
  assert.throws(
    () => parseWorkflowResult('feedback-triage', JSON.stringify({
      ...feedbackResult,
      themes: [{ name: '启动失败', count: '1' }],
    })),
    /count.*integer/,
  );
  assert.throws(
    () => parseWorkflowResult('feedback-triage', JSON.stringify({
      ...feedbackResult,
      candidates: [{
        ...feedbackResult.candidates[0],
        suggestedPriority: 'urgent',
      }],
    })),
    /suggestedPriority.*P0/,
  );
  assert.throws(
    () => parseWorkflowResult('feedback-triage', JSON.stringify({
      ...feedbackResult,
      candidates: [{ ...feedbackResult.candidates[0], extra: 'x' }],
    })),
    /extra.*not allowed/,
  );
  assert.throws(
    () => parseWorkflowResult('demo-prd-review', JSON.stringify({
      ...reviewResult,
      findings: [{ ...reviewResult.findings[0], severity: '阻塞' }],
    })),
    /severity.*致命/,
  );
  assert.throws(
    () => parseWorkflowResult('issue-strategy', JSON.stringify({
      ...strategyResult,
      acceptanceCriteria: ['有效条件', null],
    })),
    /acceptanceCriteria.*string/,
  );
});

test('parser rejects prose, invalid fences and trailing markdown', () => {
  const json = JSON.stringify(feedbackResult);
  assert.throws(
    () => parseWorkflowResult('feedback-triage', `结果如下：\n${json}`),
    /valid JSON/,
  );
  assert.throws(
    () => parseWorkflowResult('feedback-triage', `\`\`\`markdown\n${json}\n\`\`\``),
    /valid JSON/,
  );
  assert.throws(
    () => parseWorkflowResult('feedback-triage', `\`\`\`json\n${json}\n\`\`\`\n说明`),
    /valid JSON/,
  );
});
