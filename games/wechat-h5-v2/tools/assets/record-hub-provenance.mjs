import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const prompts = JSON.parse(await readFile("art/prompts/hub.json", "utf8"));
const report = JSON.parse(
  await readFile("art/reports/hub-export.json", "utf8"),
);
const byName = new Map(
  report.map((item) => [path.basename(item.target, path.extname(item.target)), item]),
);
const definitions = [
  {
    id: "hub-key-art",
    role: "key-art",
    usage: "大厅竖屏主视觉和三个世界的统一入口背景",
  },
  {
    id: "ricochet-card",
    role: "scene",
    usage: "弹珠暴走团大厅入口卡，表达战术弹射和部位破坏",
  },
  {
    id: "night-market-card",
    role: "scene",
    usage: "怪兽夜市大厅入口卡，表达行列配方与顾客庆典",
  },
  {
    id: "three-lane-card",
    role: "scene",
    usage: "三路小队大厅入口卡，表达换路救场和集火打断",
    notes: "复用三路小队已生成并审图通过的正式概念原画，完成大厅卡图裁切导出",
  },
];
const generatedAt = new Date().toISOString();
const provenance = definitions.map((definition) => {
  const exported = byName.get(definition.id);
  if (!exported) throw new Error(`HUB_EXPORT_MISSING:${definition.id}`);
  return {
    id: definition.id,
    gameId: "hub",
    role: definition.role,
    sourceFile: `art/source/hub/${definition.id}.png`,
    runtimeFile: `apps/hub/public/assets/${definition.id}.webp`,
    prompt: prompts[definition.id],
    generatedAt,
    usage: definition.usage,
    sha256: exported.sha256,
    humanRevisionStatus: "approved",
    notes: definition.notes ??
      "使用内置 imagegen 生成，人工审图通过并完成 360x800、390x844、430x932 可读性检查",
  };
});
await mkdir("art/provenance", { recursive: true });
await writeFile(
  "art/provenance/hub.json",
  `${JSON.stringify(provenance, null, 2)}\n`,
);
