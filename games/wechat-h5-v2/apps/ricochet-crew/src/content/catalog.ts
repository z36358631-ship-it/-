import type {
  HeroId,
  Modifier,
} from "../game/contracts";

export const HEROES: Readonly<
  Record<
    HeroId,
    {
      readonly name: string;
      readonly title: string;
      readonly skill: string;
      readonly portraitPosition: "left" | "center" | "right";
    }
  >
> = {
  tuo: {
    name: "岩铠·拓",
    title: "破甲先锋",
    skill: "途中再加速，并击穿护甲",
    portraitPosition: "left",
  },
  mio: {
    name: "镜羽·澪",
    title: "折射猎手",
    skill: "途中镜像转向，修正失误角度",
    portraitPosition: "center",
  },
  nia: {
    name: "环星·妮娅",
    title: "连击术士",
    skill: "途中释放环击，补上附近目标",
    portraitPosition: "right",
  },
};

export const MODIFIERS: readonly Modifier[] = [
  { id: "bank-plus", name: "折角增幅", description: "墙面反弹后速度提升", tag: "bank" },
  { id: "wall-spark", name: "墙火花", description: "每次反弹积累额外分数", tag: "bank" },
  { id: "double-bank", name: "双重折射", description: "预演额外显示一次反弹", tag: "bank" },
  { id: "tight-angle", name: "锐角奖励", description: "小角度反弹更强", tag: "bank" },
  { id: "bank-armor", name: "折射破甲", description: "反弹后首击穿甲", tag: "bank" },
  { id: "echo-wall", name: "回声墙", description: "最后一次反弹重复命中", tag: "bank" },
  { id: "skill-charge", name: "技能蓄能", description: "途中技能范围扩大", tag: "skill" },
  { id: "skill-echo", name: "技能回响", description: "技能命中追加一次冲击", tag: "skill" },
  { id: "skill-bank", name: "借墙施法", description: "反弹后技能冷却刷新", tag: "skill" },
  { id: "skill-focus", name: "弱点锁定", description: "技能优先追踪低血目标", tag: "skill" },
  { id: "skill-shield", name: "冲击护罩", description: "技能抵消一次推进", tag: "skill" },
  { id: "skill-orbit", name: "环星扩大", description: "环击覆盖更多目标", tag: "skill" },
  { id: "combo-time", name: "连击延时", description: "连击窗口更宽", tag: "combo" },
  { id: "combo-five", name: "五连爆点", description: "五连击触发遗迹爆炸", tag: "combo" },
  { id: "combo-route", name: "路径记忆", description: "显示上一发最佳角度", tag: "combo" },
  { id: "combo-finish", name: "收尾一击", description: "连续命中后强化末击", tag: "combo" },
  { id: "combo-split", name: "连锁碎片", description: "击破目标飞向附近敌人", tag: "combo" },
  { id: "combo-core", name: "核心节拍", description: "三连击可打断Boss", tag: "combo" }
];
