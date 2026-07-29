import type {
  GameId,
  GameSaveEnvelope,
} from "@gamehub/h5-contracts";

export interface SaveAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix: string): Promise<string[]>;
}

export interface SaveLoadResult<T> {
  payload: T;
  envelope: GameSaveEnvelope<T>;
  source: "primary" | "backup" | "default";
  recovered: boolean;
}

export interface SaveStoreSnapshot {
  gameId: GameId;
  primaryPresent: boolean;
  backupPresent: boolean;
  corruptCopies: number;
}

export interface SaveStore<T> {
  load(): Promise<SaveLoadResult<T>>;
  save(payload: T): Promise<GameSaveEnvelope<T>>;
  clear(): Promise<void>;
  inspect(): Promise<SaveStoreSnapshot>;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function checksum<T>(
  envelope: Omit<GameSaveEnvelope<T>, "checksum">,
): Promise<string> {
  const bytes = new TextEncoder().encode(stable(envelope));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function createSaveStore<T>(options: {
  gameId: Exclude<GameId, "hub">;
  currentSchemaVersion: number;
  defaultValue(): T;
  migrations: Record<number, (payload: T) => T>;
  adapter: SaveAdapter;
  now?: () => number;
}): SaveStore<T> {
  const prefix = `save:${options.gameId}:`;
  const primaryKey = `${prefix}primary`;
  const backupKey = `${prefix}backup`;
  const now = options.now ?? Date.now;

  const parse = async (raw: string | null) => {
    if (!raw) return null;
    const envelope = JSON.parse(raw) as GameSaveEnvelope<T>;
    const expected = await checksum({
      schemaVersion: envelope.schemaVersion,
      gameId: envelope.gameId,
      updatedAt: envelope.updatedAt,
      payload: envelope.payload,
    });
    if (envelope.gameId !== options.gameId || expected !== envelope.checksum) {
      throw new Error("SAVE_CHECKSUM_INVALID");
    }
    return envelope;
  };

  const migrate = async (input: GameSaveEnvelope<T>) => {
    let payload = input.payload;
    let version = input.schemaVersion;
    while (version < options.currentSchemaVersion) {
      const migration = options.migrations[version];
      if (!migration) throw new Error(`SAVE_MIGRATION_MISSING:${version}`);
      payload = migration(payload);
      version += 1;
    }
    if (version > options.currentSchemaVersion) {
      throw new Error(`SAVE_SCHEMA_NEWER:${version}`);
    }
    return { payload, version };
  };

  const api: SaveStore<T> = {
    async load() {
      const primaryRaw = await options.adapter.get(primaryKey);
      try {
        const primary = await parse(primaryRaw);
        if (primary) {
          const result = await migrate(primary);
          if (result.version !== primary.schemaVersion) {
            const envelope = await api.save(result.payload);
            return {
              payload: result.payload,
              envelope,
              source: "primary",
              recovered: false,
            };
          }
          return {
            payload: result.payload,
            envelope: primary,
            source: "primary",
            recovered: false,
          };
        }
      } catch {
        if (primaryRaw) {
          await options.adapter.set(`${prefix}corrupt:${now()}`, primaryRaw);
        }
      }
      const backupRaw = await options.adapter.get(backupKey);
      try {
        const backup = await parse(backupRaw);
        if (backup) {
          const result = await migrate(backup);
          const envelope = await api.save(result.payload);
          return {
            payload: result.payload,
            envelope,
            source: "backup",
            recovered: true,
          };
        }
      } catch {
        if (backupRaw) {
          await options.adapter.set(`${prefix}corrupt:${now()}`, backupRaw);
        }
      }
      const payload = options.defaultValue();
      const envelope = await api.save(payload);
      return { payload, envelope, source: "default", recovered: false };
    },
    async save(payload) {
      const previous = await options.adapter.get(primaryKey);
      if (previous) {
        try {
          await parse(previous);
          await options.adapter.set(backupKey, previous);
        } catch {
          await options.adapter.set(`${prefix}corrupt:${now()}`, previous);
        }
      }
      const unsigned = {
        schemaVersion: options.currentSchemaVersion,
        gameId: options.gameId,
        updatedAt: now(),
        payload: structuredClone(payload),
      };
      const envelope = {
        ...unsigned,
        checksum: await checksum(unsigned),
      };
      await options.adapter.set(primaryKey, JSON.stringify(envelope));
      return envelope;
    },
    async clear() {
      for (const key of await options.adapter.keys(prefix)) {
        await options.adapter.remove(key);
      }
    },
    async inspect() {
      const keys = await options.adapter.keys(prefix);
      return {
        gameId: options.gameId,
        primaryPresent: keys.includes(primaryKey),
        backupPresent: keys.includes(backupKey),
        corruptCopies: keys.filter((key) => key.startsWith(`${prefix}corrupt:`))
          .length,
      };
    },
  };
  return api;
}

export function createMemorySaveAdapter(): SaveAdapter {
  const values = new Map<string, string>();
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
    keys: async (prefix) =>
      [...values.keys()].filter((key) => key.startsWith(prefix)),
  };
}

export function createLocalStorageSaveAdapter(
  storage: Storage = localStorage,
): SaveAdapter {
  return {
    get: async (key) => storage.getItem(key),
    set: async (key, value) => storage.setItem(key, value),
    remove: async (key) => storage.removeItem(key),
    keys: async (prefix) =>
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key?.startsWith(prefix))),
  };
}
