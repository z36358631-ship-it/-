import { ENEMIES } from "../content/enemies";
import { HEROES } from "../content/heroes";
import type { CommandReason } from "../domain/applyCommand";
import type { BattleState, GridPosition } from "../domain/types";
import { HERO_ATLAS, HERO_ATLAS_URL } from "./heroAtlas";

const WIDTH = 390;
const HEIGHT = 844;
const LANE_CENTERS = [67, 195, 323] as const;
const COLUMN_Y = [190, 300, 410, 520] as const;

export interface TransferPreviewCell {
  position: GridPosition;
  reason: CommandReason;
}

export interface TransferPreview {
  heroInstanceId: string;
  source: GridPosition;
  pointer: { x: number; y: number };
  hoveredCell: GridPosition | null;
  hasMoved: boolean;
  cells: TransferPreviewCell[];
  feedback: string;
}

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
};

export class BattleScene {
  private readonly context: CanvasRenderingContext2D;
  private readonly heroAtlasImage: HTMLImageElement;
  private pixelRatio = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("CANVAS_2D_UNAVAILABLE");
    this.context = context;
    this.heroAtlasImage = new Image();
    this.canvas.dataset.heroAtlasState = "loading";
    this.heroAtlasImage.onload = () => {
      this.canvas.dataset.heroAtlasState = "ready";
    };
    this.heroAtlasImage.onerror = () => {
      this.canvas.dataset.heroAtlasState = "fallback";
    };
    this.heroAtlasImage.src = new URL(HERO_ATLAS_URL, document.baseURI).href;
    this.resize();
  }

  resize(): void {
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = WIDTH * this.pixelRatio;
    this.canvas.height = HEIGHT * this.pixelRatio;
    this.canvas.style.aspectRatio = `${WIDTH}/${HEIGHT}`;
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  logicalPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  cellAt(point: { x: number; y: number }): GridPosition | null {
    const lane = LANE_CENTERS.findIndex((center) => Math.abs(center - point.x) <= 58);
    const column = COLUMN_Y.findIndex((center) => Math.abs(center - point.y) <= 48);
    if (lane < 0 || column < 0) return null;
    return { lane: lane as 0 | 1 | 2, column: column as 0 | 1 | 2 | 3 };
  }

  heroAt(state: BattleState, point: { x: number; y: number }): string | null {
    return state.heroes.find(({ position }) =>
      Math.hypot(LANE_CENTERS[position.lane] - point.x, COLUMN_Y[position.column] - point.y) <= 35,
    )?.instanceId ?? null;
  }

  enemyAt(state: BattleState, point: { x: number; y: number }): string | null {
    return state.enemies.find(({ lane, progress }) =>
      Math.hypot(LANE_CENTERS[lane] - point.x, 170 + progress * 100 - point.y) <= 38,
    )?.instanceId ?? null;
  }

  render(
    state: BattleState,
    selectedHeroId: keyof typeof HEROES | null,
    transferPreview: TransferPreview | null = null,
  ): void {
    const context = this.context;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "rgba(7,16,33,.18)");
    sky.addColorStop(0.42, "rgba(8,20,32,.58)");
    sky.addColorStop(1, "rgba(4,10,18,.96)");
    context.fillStyle = sky;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    context.save();
    context.globalAlpha = 0.35;
    for (let index = 0; index < 9; index += 1) {
      context.fillStyle = index % 2 === 0 ? "#5d8db2" : "#4a6d86";
      context.beginPath();
      context.moveTo(index * 54 - 40, 165);
      context.lineTo(index * 54, 72 + (index % 3) * 16);
      context.lineTo(index * 54 + 46, 165);
      context.fill();
    }
    context.restore();

    context.fillStyle = "#09101d";
    context.fillRect(0, 130, WIDTH, 470);
    for (const lane of [0, 1, 2] as const) {
      const x = LANE_CENTERS[lane];
      const locked = state.laneLock?.lane === lane;
      const laneGradient = context.createLinearGradient(x - 54, 0, x + 54, 0);
      laneGradient.addColorStop(0, "rgba(68,105,132,.08)");
      laneGradient.addColorStop(0.5, locked ? "rgba(214,65,82,.3)" : "rgba(61,123,150,.28)");
      laneGradient.addColorStop(1, "rgba(68,105,132,.08)");
      context.fillStyle = laneGradient;
      context.fillRect(x - 57, 145, 114, 430);
      context.strokeStyle = locked ? "#ff596c" : "rgba(125,190,210,.32)";
      context.lineWidth = locked ? 2 : 1;
      context.setLineDash(locked ? [8, 6] : []);
      context.strokeRect(x - 57, 145, 114, 430);
      context.setLineDash([]);
      context.fillStyle = "rgba(210,236,245,.55)";
      context.font = "600 10px sans-serif";
      context.textAlign = "center";
      context.fillText(`路线 ${lane + 1}`, x, 158);
      for (const [column, y] of COLUMN_Y.entries()) {
        const occupied = state.grid.some((cell) =>
          cell.position.lane === lane && cell.position.column === column && cell.heroInstanceId,
        );
        const previewCell = transferPreview?.cells.find(({ position }) =>
          position.lane === lane && position.column === column,
        );
        const hovered = transferPreview?.hoveredCell?.lane === lane &&
          transferPreview.hoveredCell.column === column;
        roundedRect(context, x - 37, y - 33, 74, 66, 14);
        context.fillStyle = previewCell?.reason === "ok"
          ? hovered ? "rgba(54,198,145,.42)" : "rgba(54,198,145,.2)"
          : hovered && transferPreview
            ? "rgba(231,82,91,.34)"
            : occupied
              ? "rgba(22,42,60,.9)"
              : "rgba(51,90,107,.24)";
        context.fill();
        context.strokeStyle = previewCell?.reason === "ok"
          ? "#64e7b4"
          : hovered && transferPreview
            ? "#ff7b76"
            : occupied
              ? "rgba(244,201,93,.5)"
              : "rgba(122,178,194,.26)";
        context.lineWidth = hovered && transferPreview ? 3 : previewCell?.reason === "ok" ? 2 : 1;
        context.stroke();
        if (!occupied && selectedHeroId) {
          context.fillStyle = "rgba(116,229,193,.7)";
          context.font = "700 22px sans-serif";
          context.fillText("+", x, y + 7);
        }
      }
    }

    if (transferPreview) {
      const sourceX = LANE_CENTERS[transferPreview.source.lane];
      const sourceY = COLUMN_Y[transferPreview.source.column];
      const hovered = transferPreview.cells.find(({ position }) =>
        position.lane === transferPreview.hoveredCell?.lane &&
        position.column === transferPreview.hoveredCell.column,
      );
      const pathColor = hovered?.reason === "ok" ? "#64e7b4" : "#ff8b80";
      context.save();
      context.strokeStyle = pathColor;
      context.lineWidth = 3;
      context.setLineDash([9, 7]);
      context.beginPath();
      context.moveTo(sourceX, sourceY);
      context.lineTo(transferPreview.pointer.x, transferPreview.pointer.y);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = pathColor;
      context.beginPath();
      context.arc(transferPreview.pointer.x, transferPreview.pointer.y, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    for (const enemy of state.enemies) {
      const definition = ENEMIES[enemy.enemyId];
      const x = LANE_CENTERS[enemy.lane];
      const y = Math.min(570, 170 + enemy.progress * 100);
      context.save();
      if (enemy.instanceId === state.focusFire.targetId) {
        context.strokeStyle = "#ffda68";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(x, y, enemy.enemyId === "boss" ? 42 : 29, 0, Math.PI * 2);
        context.stroke();
        for (let arm = 0; arm < 4; arm += 1) {
          const angle = arm * Math.PI / 2;
          context.beginPath();
          context.moveTo(x + Math.cos(angle) * 34, y + Math.sin(angle) * 34);
          context.lineTo(x + Math.cos(angle) * 45, y + Math.sin(angle) * 45);
          context.stroke();
        }
      }
      const size = enemy.enemyId === "boss" ? 58 : enemy.enemyId === "elite" ? 42 : 34;
      const glow = context.createRadialGradient(x, y, 4, x, y, size);
      glow.addColorStop(0, definition.color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.fillRect(x - size, y - size, size * 2, size * 2);
      context.fillStyle = definition.color;
      context.beginPath();
      context.moveTo(x, y - size / 2);
      context.lineTo(x + size / 2, y + size / 3);
      context.lineTo(x, y + size / 2);
      context.lineTo(x - size / 2, y + size / 3);
      context.closePath();
      context.fill();
      const healthWidth = enemy.enemyId === "boss" ? 88 : 42;
      context.fillStyle = "rgba(0,0,0,.7)";
      context.fillRect(x - healthWidth / 2, y - size / 2 - 10, healthWidth, 5);
      context.fillStyle = enemy.enemyId === "boss" ? "#d778ff" : "#ef6a72";
      context.fillRect(x - healthWidth / 2, y - size / 2 - 10, healthWidth * Math.max(0, enemy.health / enemy.maxHealth), 5);
      context.restore();
    }

    for (const hero of state.heroes) {
      const definition = HEROES[hero.heroId];
      const atlas = HERO_ATLAS[hero.heroId];
      const x = LANE_CENTERS[hero.position.lane];
      const y = COLUMN_Y[hero.position.column];
      context.save();
      context.globalAlpha = hero.status === "moving" ? 0.6 : 1;
      context.shadowColor = definition.color;
      context.shadowBlur = hero.tier === 2 ? 20 : 10;
      roundedRect(context, x - 28, y - 31, 56, 62, 18);
      context.fillStyle = "rgba(4,11,20,.96)";
      context.fill();
      context.shadowBlur = 0;
      context.save();
      roundedRect(context, x - 26, y - 29, 52, 58, 16);
      context.clip();
      if (this.canvas.dataset.heroAtlasState === "ready" && this.heroAtlasImage.naturalWidth > 0) {
        const sliceWidth = this.heroAtlasImage.naturalWidth / 5;
        const sourceHeight = this.heroAtlasImage.naturalHeight * 0.52;
        context.drawImage(
          this.heroAtlasImage,
          atlas.index * sliceWidth,
          this.heroAtlasImage.naturalHeight * atlas.sourceYRatio,
          sliceWidth,
          sourceHeight,
          x - 26,
          y - 29,
          52,
          58,
        );
      } else {
        const fallback = context.createLinearGradient(x, y - 29, x, y + 29);
        fallback.addColorStop(0, definition.color);
        fallback.addColorStop(1, "#111d2c");
        context.fillStyle = fallback;
        context.fillRect(x - 26, y - 29, 52, 58);
        context.fillStyle = "rgba(5,12,21,.62)";
        context.beginPath();
        context.arc(x, y - 8, 10, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.ellipse(x, y + 19, 20, 18, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      roundedRect(context, x - 28, y - 31, 56, 62, 18);
      context.strokeStyle = definition.color;
      context.lineWidth = 2;
      context.stroke();
      if (hero.tier === 2) {
        context.strokeStyle = "#ffe193";
        context.lineWidth = 2;
        roundedRect(context, x - 32, y - 35, 64, 70, 21);
        context.stroke();
        context.fillStyle = "#ffe193";
        context.font = "700 10px sans-serif";
        context.textAlign = "center";
        context.fillText("II", x, y - 39);
      }
      if (hero.instanceId === transferPreview?.heroInstanceId) {
        context.strokeStyle = "#ffe38d";
        context.lineWidth = 4;
        context.shadowColor = "#ffe38d";
        context.shadowBlur = 16;
        roundedRect(context, x - 34, y - 37, 68, 74, 22);
        context.stroke();
      }
      context.restore();
    }

    if (state.boss.phase === "charge") {
      const progress = 1 - Math.max(0, (state.boss.phaseEndsAtMs - state.elapsedMs) / 4_000);
      context.fillStyle = "rgba(48,8,75,.86)";
      context.fillRect(28, 112, 334, 10);
      context.fillStyle = "#d86cff";
      context.fillRect(28, 112, 334 * progress, 10);
      context.strokeStyle = "#f0b5ff";
      context.strokeRect(28, 112, 334, 10);
    }

    context.fillStyle = "rgba(5,11,20,.94)";
    context.fillRect(0, 600, WIDTH, 244);
    context.strokeStyle = "rgba(128,179,205,.22)";
    context.beginPath();
    context.moveTo(0, 600);
    context.lineTo(WIDTH, 600);
    context.stroke();

    if (transferPreview) {
      const hoveredIsLegal = transferPreview.cells.some(({ position, reason }) =>
        position.lane === transferPreview.hoveredCell?.lane &&
        position.column === transferPreview.hoveredCell.column &&
        reason === "ok",
      );
      context.save();
      context.font = "700 12px sans-serif";
      context.textAlign = "center";
      const labelWidth = Math.min(
        330,
        Math.max(126, context.measureText(transferPreview.feedback).width + 32),
      );
      roundedRect(context, (WIDTH - labelWidth) / 2, 562, labelWidth, 30, 15);
      context.fillStyle = "rgba(4,14,23,.94)";
      context.fill();
      context.strokeStyle = hoveredIsLegal ? "#64e7b4" : "#ff8b80";
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = "#f3fbf8";
      context.fillText(transferPreview.feedback, WIDTH / 2, 582);
      context.restore();
    }
  }
}

export const BATTLE_LOGICAL_SIZE = { width: WIDTH, height: HEIGHT } as const;
