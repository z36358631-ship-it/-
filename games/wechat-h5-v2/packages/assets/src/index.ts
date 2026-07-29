import type {
  AssetEntry,
  AssetManifest,
} from "@gamehub/h5-contracts";
export type { AssetManifest } from "@gamehub/h5-contracts";

export interface AssetAdapter {
  fetchBytes(entry: AssetEntry, signal: AbortSignal): Promise<Uint8Array>;
  decode(entry: AssetEntry, bytes: Uint8Array): Promise<unknown>;
  release(entry: AssetEntry, value: unknown): Promise<void> | void;
}

export interface AssetProgress {
  groupId: string;
  loadedAssets: number;
  totalAssets: number;
  loadedBytes: number;
  totalBytes: number;
}

export interface AssetLoaderSnapshot {
  loadedGroupIds: string[];
  loadedAssetIds: string[];
  loadedBytes: number;
  estimatedTextureBytes: number;
  failedGroupIds: string[];
}

export interface AssetLoader {
  loadGroup(
    groupId: string,
    onProgress?: (progress: AssetProgress) => void,
  ): Promise<void>;
  retryGroup(groupId: string): Promise<void>;
  get<T>(assetId: string): T;
  releaseGroup(groupId: string): Promise<void>;
  snapshot(): AssetLoaderSnapshot;
  dispose(): Promise<void>;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function createAssetLoader(options: {
  manifest: AssetManifest;
  adapter: AssetAdapter;
  digest?: (bytes: Uint8Array) => Promise<string>;
  maxAttempts?: number;
}): AssetLoader {
  const values = new Map<string, unknown>();
  const loadedGroups = new Set<string>();
  const failedGroups = new Set<string>();
  const controllers = new Map<string, AbortController>();
  const digest = options.digest ?? sha256Hex;
  const maxAttempts = options.maxAttempts ?? 2;
  const entries = new Map(
    options.manifest.groups.flatMap((group) =>
      group.assets.map((entry) => [entry.id, entry] as const),
    ),
  );

  const loadEntry = async (entry: AssetEntry, signal: AbortSignal) => {
    let error: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const bytes = await options.adapter.fetchBytes(entry, signal);
        if ((await digest(bytes)) !== entry.sha256) {
          throw new Error(`ASSET_HASH_MISMATCH:${entry.id}`);
        }
        const value = await options.adapter.decode(entry, bytes);
        values.set(entry.id, value);
        return;
      } catch (caught) {
        error = caught;
        if (
          caught instanceof Error &&
          caught.message.startsWith("ASSET_HASH_MISMATCH:")
        ) {
          break;
        }
      }
    }
    throw error;
  };

  const api: AssetLoader = {
    async loadGroup(groupId, onProgress) {
      const group = options.manifest.groups.find((item) => item.id === groupId);
      if (!group) throw new Error(`ASSET_GROUP_UNKNOWN:${groupId}`);
      if (loadedGroups.has(groupId)) return;
      const controller = new AbortController();
      controllers.set(groupId, controller);
      let loadedAssets = 0;
      let loadedBytes = 0;
      const totalBytes = group.assets.reduce(
        (sum, entry) => sum + entry.bytes,
        0,
      );
      try {
        for (const entry of group.assets) {
          await loadEntry(entry, controller.signal);
          loadedAssets += 1;
          loadedBytes += entry.bytes;
          onProgress?.({
            groupId,
            loadedAssets,
            totalAssets: group.assets.length,
            loadedBytes,
            totalBytes,
          });
        }
        failedGroups.delete(groupId);
        loadedGroups.add(groupId);
      } catch (error) {
        failedGroups.add(groupId);
        throw error;
      } finally {
        controllers.delete(groupId);
      }
    },
    retryGroup(groupId) {
      failedGroups.delete(groupId);
      return api.loadGroup(groupId);
    },
    get<T>(assetId: string): T {
      if (!values.has(assetId)) throw new Error(`ASSET_NOT_LOADED:${assetId}`);
      return values.get(assetId) as T;
    },
    async releaseGroup(groupId) {
      const group = options.manifest.groups.find((item) => item.id === groupId);
      if (!group) return;
      for (const entry of group.assets) {
        const value = values.get(entry.id);
        if (value !== undefined) {
          await options.adapter.release(entry, value);
          values.delete(entry.id);
        }
      }
      loadedGroups.delete(groupId);
      failedGroups.delete(groupId);
    },
    snapshot() {
      const loadedEntries = [...values.keys()]
        .map((id) => entries.get(id))
        .filter((entry): entry is AssetEntry => Boolean(entry));
      return {
        loadedGroupIds: [...loadedGroups],
        loadedAssetIds: [...values.keys()],
        loadedBytes: loadedEntries.reduce(
          (sum, entry) => sum + entry.bytes,
          0,
        ),
        estimatedTextureBytes: loadedEntries.reduce(
          (sum, entry) =>
            sum +
            (entry.width && entry.height
              ? entry.width * entry.height * 4
              : 0),
          0,
        ),
        failedGroupIds: [...failedGroups],
      };
    },
    async dispose() {
      controllers.forEach((controller) => controller.abort());
      for (const group of options.manifest.groups) {
        await api.releaseGroup(group.id);
      }
    },
  };
  return api;
}

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

export function inferAssetMimeType(entry: AssetEntry): string {
  const pathname = entry.url.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  const dot = pathname.lastIndexOf(".");
  const extension = dot >= 0 ? pathname.slice(dot) : "";
  const byExtension = MIME_BY_EXTENSION[extension];
  if (byExtension) return byExtension;
  switch (entry.type) {
    case "json":
    case "atlas":
      return "application/json";
    case "audio":
      return "audio/mpeg";
    case "font":
      return "font/woff2";
    case "texture":
      return "application/octet-stream";
  }
}

export function createBrowserAssetAdapter(options: {
  decodeBlob(
    entry: AssetEntry,
    url: string,
    bytes: Uint8Array,
  ): Promise<unknown>;
  releaseDecoded(entry: AssetEntry, value: unknown): Promise<void> | void;
}): AssetAdapter {
  const blobUrls = new Map<string, string>();
  return {
    async fetchBytes(entry, signal) {
      const response = await fetch(entry.url, {
        signal,
        cache: "force-cache",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`ASSET_HTTP_${response.status}:${entry.id}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    async decode(entry, bytes) {
      const url = URL.createObjectURL(
        new Blob([bytes], { type: inferAssetMimeType(entry) }),
      );
      blobUrls.set(entry.id, url);
      return options.decodeBlob(entry, url, bytes);
    },
    async release(entry, value) {
      await options.releaseDecoded(entry, value);
      const url = blobUrls.get(entry.id);
      if (url) URL.revokeObjectURL(url);
      blobUrls.delete(entry.id);
    },
  };
}
