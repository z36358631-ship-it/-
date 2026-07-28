function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}

function strictObject(properties) {
  return {
    type: 'object',
    required: Object.keys(properties),
    additionalProperties: false,
    properties,
  };
}

function arrayOf(items) {
  return { type: 'array', items };
}

const stringSchema = { type: 'string' };
const nullableStringSchema = { type: ['string', 'null'] };

const feedbackOutputSchema = strictObject({
  themes: arrayOf(strictObject({
    name: stringSchema,
    count: { type: 'integer', minimum: 1 },
  })),
  duplicates: arrayOf(strictObject({
    merged: stringSchema,
    sources: arrayOf(stringSchema),
  })),
  existingMatches: arrayOf(strictObject({
    candidate: stringSchema,
    requirementId: stringSchema,
    reason: stringSchema,
  })),
  candidates: arrayOf(strictObject({
    title: stringSchema,
    evidence: stringSchema,
    matchedRequirementId: nullableStringSchema,
    suggestedPriority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
  })),
  informationGaps: arrayOf(stringSchema),
});

const reviewOutputSchema = strictObject({
  summary: stringSchema,
  findings: arrayOf(strictObject({
    category: { type: 'string', enum: ['差异', '遗漏', '异常', '边界'] },
    location: stringSchema,
    severity: { type: 'string', enum: ['致命', '严重', '一般', '建议'] },
    impact: stringSchema,
    recommendation: stringSchema,
  })),
});

const strategyOutputSchema = strictObject({
  essence: stringSchema,
  mainFlow: stringSchema,
  exceptionPolicy: stringSchema,
  boundaryPolicy: stringSchema,
  documentLocations: arrayOf(stringSchema),
  acceptanceCriteria: arrayOf(stringSchema),
  feishuSummary: stringSchema,
});

export const workflowCatalog = deepFreeze({
  'feedback-triage': {
    label: '整理反馈并去重',
    permission: 'read-only',
    requiredInput: ['feedbackText'],
    instruction: '统计反馈主题，合并重复表达，匹配现有需求，生成新需求候选，并指出信息缺口与建议优先级。不得虚构反馈数量。',
    outputSchema: feedbackOutputSchema,
  },
  'demo-prd-review': {
    label: '检查 Demo、PRD 差异与漏洞',
    permission: 'read-only',
    requiredInput: [],
    requiredArtifactKinds: ['Demo', 'PRD'],
    instruction: '逐项比较 Demo、PRD 与当前业务规则，检查可定位差异、遗漏、异常和边界。每一项都要给出严重度、影响和应该修改哪个产物。',
    outputSchema: reviewOutputSchema,
  },
  'issue-strategy': {
    label: '开发/测试问题转产品策略',
    permission: 'read-only',
    requiredInput: ['issueText'],
    instruction: '把开发问题或测试异常还原为产品决策，分别给出主流程、异常和边界策略、文档修改位置、验收条件与飞书同步摘要。',
    outputSchema: strategyOutputSchema,
  },
});

function requestError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function getWorkflow(type) {
  if (typeof type !== 'string' || !Object.hasOwn(workflowCatalog, type)) {
    throw requestError('Unknown workflow type');
  }
  return workflowCatalog[type];
}

export function validateWorkflowInput(type, input = {}, artifacts = []) {
  const workflow = getWorkflow(type);
  const safeInput = input && typeof input === 'object' ? input : {};
  const safeArtifacts = Array.isArray(artifacts) ? artifacts : [];
  for (const field of workflow.requiredInput) {
    if (
      !Object.hasOwn(safeInput, field)
      || typeof safeInput[field] !== 'string'
      || !safeInput[field].trim()
    ) {
      throw requestError(`${field} is required`);
    }
  }
  for (const kind of workflow.requiredArtifactKinds || []) {
    if (!safeArtifacts.some(item => (
      item
      && typeof item === 'object'
      && Object.hasOwn(item, 'kind')
      && item.kind === kind
    ))) {
      throw requestError(`${kind} artifact is required`);
    }
  }
  return workflow;
}

export function buildWorkflowPrompt(type, { requirement, files = [], input = {} }) {
  const workflow = validateWorkflowInput(type, input, files);
  return [
    '你正在个人产品经理工作台中执行只读分析。不得修改、创建、移动或删除文件。',
    `当前需求：${requirement.id} ${requirement.title}`,
    `当前阶段：${requirement.stage}`,
    `已授权产物：\n${files.map(item => `- [${item.kind}] ${item.path}`).join('\n') || '- 无'}`,
    `任务要求：${workflow.instruction}`,
    `业务输入：${JSON.stringify(input, null, 2)}`,
    '只输出一个符合下列 JSON Schema 的 JSON 对象，不要输出 Markdown、代码围栏或解释文字。',
    JSON.stringify(workflow.outputSchema, null, 2),
  ].join('\n\n');
}

function matchesType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function typeLabel(types) {
  return types.join(' or ');
}

function validateAgainstSchema(value, schema, location = '$') {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.some(type => matchesType(value, type))) {
    throw new Error(`Structured result ${location} must be ${typeLabel(types)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    throw new Error(
      `Structured result ${location} must be one of ${schema.enum.join(', ')}`,
    );
  }
  if (schema.minimum !== undefined && value < schema.minimum) {
    throw new Error(`Structured result ${location} must be at least ${schema.minimum}`);
  }
  if (value === null) return;

  if (types.includes('object')) {
    for (const field of schema.required || []) {
      if (!Object.hasOwn(value, field)) {
        throw new Error(`Structured result ${location}.${field} is required`);
      }
    }
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties || {}, key)) {
        if (schema.additionalProperties === false) {
          throw new Error(`Structured result ${location}.${key} is not allowed`);
        }
        continue;
      }
      validateAgainstSchema(value[key], schema.properties[key], `${location}.${key}`);
    }
  }

  if (types.includes('array')) {
    value.forEach((item, index) => {
      validateAgainstSchema(item, schema.items, `${location}[${index}]`);
    });
  }
}

function extractJson(rawText) {
  const normalized = String(rawText ?? '').trim();
  const fenced = /^```json[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/i.exec(normalized);
  return fenced ? fenced[1].trim() : normalized;
}

export function parseWorkflowResult(type, rawText) {
  const workflow = getWorkflow(type);
  let value;
  try {
    value = JSON.parse(extractJson(rawText));
  } catch {
    throw new Error('Codex did not return valid JSON');
  }
  validateAgainstSchema(value, workflow.outputSchema);
  return value;
}
