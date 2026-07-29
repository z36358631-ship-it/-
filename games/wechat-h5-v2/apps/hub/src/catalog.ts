import type { GameId } from "@gamehub/h5-contracts";

export interface GameCatalogItem {
  id: Exclude<GameId, "hub">;
  title: string;
  kicker: string;
  description: string;
  coreInput: string;
  duration: string;
  art: string;
  href: string;
  accent: string;
}

export const GAME_CATALOG: readonly GameCatalogItem[] = [
  {
    id: "ricochet-crew",
    title: "弹珠暴走团",
    kicker: "一发改写整条弹道",
    description: "瞄准、松手、途中发动角色技，在机械遗迹里撞出连锁爆破。",
    coreInput: "战术弹射",
    duration: "约 5 分钟",
    art: "./assets/ricochet-card.webp",
    href: "../ricochet-crew/",
    accent: "#61e7ff",
  },
  {
    id: "monster-night-market",
    title: "怪兽夜市",
    kicker: "一步同时端出三道菜",
    description: "滑动整行或整列，为怪兽顾客规划配方、留料和连灶庆典。",
    coreInput: "行列滑动",
    duration: "4–5 分钟",
    art: "./assets/night-market-card.webp",
    href: "../monster-night-market/",
    accent: "#ffbd55",
  },
  {
    id: "three-lane-squad",
    title: "三路小队",
    kicker: "拆阵换路，极限救场",
    description: "部署、进化、换路和集火，在三条防线上主动打断巨兽。",
    coreInput: "拖放调兵",
    duration: "约 6 分钟",
    art: "./assets/three-lane-card.webp",
    href: "../three-lane-squad/",
    accent: "#b7a5ff",
  },
] as const;
