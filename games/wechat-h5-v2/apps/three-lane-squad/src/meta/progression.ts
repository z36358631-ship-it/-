import type { ThreeLaneSave } from "./saveModel";

export interface ProgressionGoal {
  title: string;
  detail: string;
  progress: string;
}

export function shouldOfferRecoveryRun(save: ThreeLaneSave): boolean {
  const latest = save.runHistory.slice(-2);
  return latest.length === 2 && latest.every(({ result }) => result === "lost");
}

export function nextProgressionGoal(save: ThreeLaneSave): ProgressionGoal {
  if (save.runHistory.length === 0) {
    return {
      title: "完成首次远征",
      detail: "完成一局即可解锁「快速接力」。",
      progress: "0 / 1 局",
    };
  }
  if (!save.unlockedDoctrineIds.includes("reserve-slot")) {
    return {
      title: "布成三路均衡",
      detail: "三路都部署英雄并完成一局，解锁「预备席」。胜负不限。",
      progress: "0 / 1 次",
    };
  }
  if (!save.unlockedBannerIds.includes("storm-line")) {
    return {
      title: "完成集火斩首",
      detail: "一局内至少使用两次集火，解锁「风暴军旗」。",
      progress: "0 / 1 次",
    };
  }
  const nextLevel = Math.min(10, save.commanderLevel + 1);
  return save.commanderLevel < 10
    ? {
        title: `晋升指挥官 ${nextLevel}`,
        detail: "再完成一局，继续扩充最近远征档案。",
        progress: `${save.commanderLevel} / 10 级`,
      }
    : {
        title: "挑战今日固定敌序",
        detail: "使用不同阵型重打同一敌序，验证你的战术是否稳定。",
        progress: "每日 1 次",
      };
}
