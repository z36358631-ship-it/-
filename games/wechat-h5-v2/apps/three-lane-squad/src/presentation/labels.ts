import type { FormationTag, HeroRole, RunVariant } from "../domain/types";

const VARIANT_LABELS: Record<RunVariant, string> = {
  "balanced-front": "均衡前线",
  lockdown: "封锁战",
  "elite-rush": "精英突袭",
};

const FORMATION_LABELS: Record<FormationTag, string> = {
  balanced: "三路均衡",
  "mobile-reserve": "机动预备",
  "focus-kill": "集火斩首",
  unclassified: "临场应变",
};

const ROLE_LABELS: Record<HeroRole, string> = {
  block: "前排阻挡",
  "speed-counter": "迅捷克制",
  "armor-break": "重甲破防",
  "zone-control": "区域控制",
  support: "战场支援",
};

export const variantLabel = (variant: RunVariant): string =>
  VARIANT_LABELS[variant];

export const formationLabel = (formation: FormationTag): string =>
  FORMATION_LABELS[formation];

export const heroRoleLabel = (role: HeroRole): string =>
  ROLE_LABELS[role];
