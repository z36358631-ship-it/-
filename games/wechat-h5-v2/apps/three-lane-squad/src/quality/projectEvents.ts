import type { DomainEvent } from "../domain/types";

export interface ProjectedEvent {
  name: string;
  payload: Record<string, string | number | boolean>;
}

const stringAt = (payload: Record<string, unknown>, key: string): string =>
  typeof payload[key] === "string" ? payload[key] : "";
const numberAt = (payload: Record<string, unknown>, key: string): number =>
  typeof payload[key] === "number" ? payload[key] : -1;

export function projectDomainEvent(runId: string, event: DomainEvent): ProjectedEvent | null {
  const base = { runId, seq: event.seq, atMs: event.atMs };
  if (event.type === "deploy" || event.type === "transfer") {
    const to = (event.payload.to ?? {}) as Record<string, unknown>;
    return {
      name: `squad_${event.type}`,
      payload: {
        ...base,
        heroId: stringAt(event.payload, "heroId"),
        heroInstanceId: stringAt(event.payload, "heroInstanceId"),
        lane: numberAt(to, "lane"),
        column: numberAt(to, "column"),
      },
    };
  }
  if (event.type === "evolve") {
    return {
      name: "squad_evolve",
      payload: {
        ...base,
        targetId: stringAt(event.payload, "targetId"),
        evolvedRule: stringAt(event.payload, "evolvedRule"),
      },
    };
  }
  if (event.type === "focus_fire" || event.type === "boss_interrupt") {
    return {
      name: `squad_${event.type}`,
      payload: {
        ...base,
        lane: numberAt(event.payload, "lane"),
        targetId: stringAt(event.payload, "enemyInstanceId"),
      },
    };
  }
  if (event.type === "run_won" || event.type === "run_lost") {
    return { name: "squad_run_complete", payload: { ...base, won: event.type === "run_won" } };
  }
  return null;
}
