import path from "node:path";
import { inflateRawSync } from "node:zlib";

const SIGNATURE_LOCAL = 0x04034b50;
const SIGNATURE_CENTRAL = 0x02014b50;
const SIGNATURE_EOCD = 0x06054b50;
const ZIP64_EXTRA_ID = 0x0001;
const ENCRYPTED_FLAG = 0x0001;
const DESCRIPTOR_FLAG = 0x0008;
const STRONG_ENCRYPTION_FLAGS = 0x2040;
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return value >>> 0;
});

const DEFAULT_LIMITS = Object.freeze({
  maxEntries: 10_000,
  maxEntryBytes: 134_217_728,
  maxTotalBytes: 268_435_456,
  maxCompressionRatio: 100,
});

function zipError(code, detail = "") {
  const error = new Error(
    `AI_PLAYTEST_${code}${detail ? `:${detail}` : ""}`,
  );
  error.code = `AI_PLAYTEST_${code}`;
  return error;
}

function asBytes(value) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw zipError("ZIP_INPUT");
  }
  return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

function positiveLimit(value, fallback, name) {
  const selected = value ?? fallback;
  if (!Number.isSafeInteger(selected) || selected < 1) {
    throw zipError("ZIP_LIMIT", name);
  }
  return selected;
}

function compressionRatioLimit(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    throw zipError("ZIP_LIMIT", "maxCompressionRatio");
  }
  return value;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parseExtraFields(extra, entryName) {
  let offset = 0;
  while (offset < extra.length) {
    if (extra.length - offset < 4) {
      throw zipError("ZIP_EXTRA", entryName);
    }
    const id = extra.readUInt16LE(offset);
    const length = extra.readUInt16LE(offset + 2);
    offset += 4;
    if (length > extra.length - offset) {
      throw zipError("ZIP_EXTRA", entryName);
    }
    if (id === ZIP64_EXTRA_ID) throw zipError("ZIP64", entryName);
    if (id === 0x7075 || id === 0x6375) {
      throw zipError("ZIP_EXTRA_UNICODE", entryName);
    }
    throw zipError("ZIP_EXTRA_UNSUPPORTED", `${entryName}:${id}`);
  }
}

function decodeSafeName(nameBytes) {
  if (
    nameBytes.length < 1
    || [...nameBytes].some((byte) => byte < 0x20 || byte > 0x7e)
  ) {
    throw zipError("ZIP_NAME_ENCODING");
  }
  return nameBytes.toString("ascii");
}

function normalizedSafePath(name) {
  const normalized = path.posix.normalize(name);
  if (
    name.includes("\0")
    || name.includes("\\")
    || name.startsWith("/")
    || name.startsWith("//")
    || /^[A-Za-z]:/u.test(name)
  ) {
    throw zipError("ZIP_PATH", name);
  }
  const segments = name.split("/");
  if (
    segments.some((segment) => (
      segment === "" || segment === "." || segment === ".."
    ))
    || normalized !== name
  ) {
    throw zipError("ZIP_PATH", name);
  }
  return normalized;
}

function assertRegularFile(versionMadeBy, externalAttributes, name) {
  const creatorSystem = versionMadeBy >>> 8;
  const dosAttributes = externalAttributes & 0xffff;
  if ((dosAttributes & (0x0008 | 0x0010 | 0x0400)) !== 0) {
    throw zipError("ZIP_ENTRY_TYPE", name);
  }
  const mode = externalAttributes >>> 16;
  const fileType = mode & 0xf000;
  if (fileType !== 0 && fileType !== 0x8000) {
    throw zipError("ZIP_ENTRY_TYPE", name);
  }
  if (creatorSystem === 3 && mode !== 0 && fileType !== 0x8000) {
    throw zipError("ZIP_ENTRY_TYPE", name);
  }
}

function findEocd(bytes) {
  const minimum = Math.max(0, bytes.length - 65_557);
  const candidates = [];
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) !== SIGNATURE_EOCD) continue;
    const commentLength = bytes.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === bytes.length) {
      candidates.push(offset);
    }
  }
  if (candidates.length !== 1) throw zipError("ZIP_EOCD");
  return candidates[0];
}

function validateFlagsAndMethod(flags, method, entryName) {
  if ((flags & (ENCRYPTED_FLAG | STRONG_ENCRYPTION_FLAGS)) !== 0) {
    throw zipError("ZIP_ENCRYPTED", entryName);
  }
  if ((flags & DESCRIPTOR_FLAG) !== 0) {
    throw zipError("ZIP_DESCRIPTOR", entryName);
  }
  if (flags !== 0 && flags !== 0x0800) {
    throw zipError("ZIP_FLAGS", `${entryName}:${flags}`);
  }
  if (method !== 0 && method !== 8) {
    throw zipError("ZIP_METHOD", `${entryName}:${method}`);
  }
}

export function readBoundedZip(value, {
  maxEntries = DEFAULT_LIMITS.maxEntries,
  maxEntryBytes = DEFAULT_LIMITS.maxEntryBytes,
  maxTotalBytes = DEFAULT_LIMITS.maxTotalBytes,
  maxCompressionRatio = DEFAULT_LIMITS.maxCompressionRatio,
} = {}) {
  const limits = {
    maxEntries: positiveLimit(
      maxEntries,
      undefined,
      "maxEntries",
    ),
    maxEntryBytes: positiveLimit(
      maxEntryBytes,
      undefined,
      "maxEntryBytes",
    ),
    maxTotalBytes: positiveLimit(
      maxTotalBytes,
      undefined,
      "maxTotalBytes",
    ),
    maxCompressionRatio: compressionRatioLimit(
      maxCompressionRatio,
    ),
  };
  const bytes = asBytes(value);
  if (bytes.length > limits.maxTotalBytes) {
    throw zipError("ZIP_TOTAL_SIZE", String(bytes.length));
  }
  if (bytes.length < 22) throw zipError("ZIP_EOCD");
  if (bytes.readUInt32LE(0) !== SIGNATURE_LOCAL) {
    throw zipError("ZIP_SFX");
  }

  const eocdOffset = findEocd(bytes);
  const diskNumber = bytes.readUInt16LE(eocdOffset + 4);
  const centralDisk = bytes.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = bytes.readUInt16LE(eocdOffset + 8);
  const entryCount = bytes.readUInt16LE(eocdOffset + 10);
  const centralSize = bytes.readUInt32LE(eocdOffset + 12);
  const centralOffset = bytes.readUInt32LE(eocdOffset + 16);
  if (
    entriesOnDisk === 0xffff
    || entryCount === 0xffff
    || centralSize === 0xffffffff
    || centralOffset === 0xffffffff
  ) {
    throw zipError("ZIP64");
  }
  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    throw zipError("ZIP_MULTIDISK");
  }
  if (entryCount < 1 || entryCount > limits.maxEntries) {
    throw zipError("ZIP_ENTRY_COUNT", String(entryCount));
  }
  if (
    centralOffset < 1
    || centralSize < 46
    || centralOffset > eocdOffset
    || centralSize !== eocdOffset - centralOffset
  ) {
    throw zipError("ZIP_CENTRAL_DIRECTORY");
  }

  const entries = [];
  const rawNames = new Set();
  const decodedNames = new Set();
  const normalizedNames = new Set();
  let centralCursor = centralOffset;
  let totalUncompressedSize = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      centralCursor > eocdOffset - 46
      || bytes.readUInt32LE(centralCursor) !== SIGNATURE_CENTRAL
    ) {
      throw zipError("ZIP_CENTRAL_DIRECTORY", String(index));
    }
    const versionMadeBy = bytes.readUInt16LE(centralCursor + 4);
    const versionNeeded = bytes.readUInt16LE(centralCursor + 6);
    const flags = bytes.readUInt16LE(centralCursor + 8);
    const method = bytes.readUInt16LE(centralCursor + 10);
    const checksum = bytes.readUInt32LE(centralCursor + 16);
    const compressedSize = bytes.readUInt32LE(centralCursor + 20);
    const uncompressedSize = bytes.readUInt32LE(centralCursor + 24);
    const nameLength = bytes.readUInt16LE(centralCursor + 28);
    const extraLength = bytes.readUInt16LE(centralCursor + 30);
    const commentLength = bytes.readUInt16LE(centralCursor + 32);
    const diskStart = bytes.readUInt16LE(centralCursor + 34);
    const externalAttributes = bytes.readUInt32LE(centralCursor + 38);
    const localOffset = bytes.readUInt32LE(centralCursor + 42);
    const variableLength = nameLength + extraLength + commentLength;
    const nextCentral = centralCursor + 46 + variableLength;
    if (nextCentral > eocdOffset) {
      throw zipError("ZIP_CENTRAL_DIRECTORY", String(index));
    }
    if (nameLength < 1) throw zipError("ZIP_NAME_ENCODING");
    if (
      versionNeeded >= 45
      || compressedSize === 0xffffffff
      || uncompressedSize === 0xffffffff
      || localOffset === 0xffffffff
    ) {
      throw zipError("ZIP64", String(index));
    }
    if (diskStart !== 0) throw zipError("ZIP_MULTIDISK");
    const nameStart = centralCursor + 46;
    const nameBytes = bytes.subarray(nameStart, nameStart + nameLength);
    const extra = bytes.subarray(
      nameStart + nameLength,
      nameStart + nameLength + extraLength,
    );
    const rawKey = nameBytes.toString("hex");
    const name = decodeSafeName(nameBytes);
    const normalized = path.posix.normalize(name);
    if (
      rawNames.has(rawKey)
      || decodedNames.has(name)
      || normalizedNames.has(normalized)
    ) {
      throw zipError("ZIP_DUPLICATE", name);
    }
    rawNames.add(rawKey);
    decodedNames.add(name);
    normalizedNames.add(normalized);
    normalizedSafePath(name);
    parseExtraFields(extra, name);
    validateFlagsAndMethod(flags, method, name);
    assertRegularFile(versionMadeBy, externalAttributes, name);
    if (
      compressedSize > limits.maxEntryBytes
      || uncompressedSize > limits.maxEntryBytes
    ) {
      throw zipError("ZIP_ENTRY_SIZE", name);
    }
    totalUncompressedSize += uncompressedSize;
    if (
      !Number.isSafeInteger(totalUncompressedSize)
      || totalUncompressedSize > limits.maxTotalBytes
    ) {
      throw zipError("ZIP_TOTAL_SIZE");
    }
    if (
      uncompressedSize > 0
      && (
        compressedSize === 0
        || uncompressedSize / compressedSize > limits.maxCompressionRatio
      )
    ) {
      throw zipError("ZIP_RATIO", name);
    }
    if (method === 0 && compressedSize !== uncompressedSize) {
      throw zipError("ZIP_STORED_SIZE", name);
    }
    entries.push({
      name,
      nameBytes: Buffer.from(nameBytes),
      versionNeeded,
      flags,
      method,
      checksum,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    centralCursor = nextCentral;
  }
  if (centralCursor !== eocdOffset) {
    throw zipError("ZIP_CENTRAL_DIRECTORY");
  }

  const localOffsets = new Set();
  for (const entry of entries) {
    if (localOffsets.has(entry.localOffset)) {
      throw zipError("ZIP_LOCAL_OVERLAP", entry.name);
    }
    localOffsets.add(entry.localOffset);
    if (
      entry.localOffset >= centralOffset
      || entry.localOffset > centralOffset - 30
    ) {
      throw zipError("ZIP_LOCAL_POINTER", entry.name);
    }
  }

  const intervals = [];
  for (const entry of entries) {
    const offset = entry.localOffset;
    if (bytes.readUInt32LE(offset) !== SIGNATURE_LOCAL) {
      throw zipError("ZIP_LOCAL_HEADER", entry.name);
    }
    const versionNeeded = bytes.readUInt16LE(offset + 4);
    const flags = bytes.readUInt16LE(offset + 6);
    const method = bytes.readUInt16LE(offset + 8);
    const checksum = bytes.readUInt32LE(offset + 14);
    const compressedSize = bytes.readUInt32LE(offset + 18);
    const uncompressedSize = bytes.readUInt32LE(offset + 22);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const extraStart = nameStart + nameLength;
    const dataStart = extraStart + extraLength;
    if (dataStart > centralOffset) {
      throw zipError("ZIP_LOCAL_OVERLAP", entry.name);
    }
    const localName = bytes.subarray(nameStart, extraStart);
    if (
      versionNeeded !== entry.versionNeeded
      || flags !== entry.flags
      || method !== entry.method
      || checksum !== entry.checksum
      || compressedSize !== entry.compressedSize
      || uncompressedSize !== entry.uncompressedSize
      || !localName.equals(entry.nameBytes)
    ) {
      throw zipError("ZIP_HEADER_MISMATCH", entry.name);
    }
    parseExtraFields(
      bytes.subarray(extraStart, dataStart),
      entry.name,
    );
    const dataEnd = dataStart + entry.compressedSize;
    if (
      dataEnd < dataStart
      || dataEnd > centralOffset
    ) {
      throw zipError("ZIP_LOCAL_OVERLAP", entry.name);
    }
    intervals.push({
      start: offset,
      end: dataEnd,
      dataStart,
      dataEnd,
      entry,
    });
  }
  intervals.sort((left, right) => left.start - right.start);
  let expectedStart = 0;
  for (const interval of intervals) {
    if (interval.start < expectedStart) {
      throw zipError("ZIP_LOCAL_OVERLAP", interval.entry.name);
    }
    if (interval.start !== expectedStart) {
      throw zipError(
        expectedStart === 0 ? "ZIP_SFX" : "ZIP_LOCAL_LAYOUT",
        interval.entry.name,
      );
    }
    expectedStart = interval.end;
  }
  if (expectedStart !== centralOffset) {
    throw zipError("ZIP_LOCAL_LAYOUT");
  }

  const output = new Map();
  for (const interval of intervals) {
    const { entry } = interval;
    const compressed = bytes.subarray(
      interval.dataStart,
      interval.dataEnd,
    );
    let decoded;
    if (entry.method === 0) {
      decoded = compressed;
    } else {
      try {
        decoded = inflateRawSync(compressed, {
          maxOutputLength: Math.max(1, entry.uncompressedSize),
        });
      } catch (error) {
        throw zipError(
          "ZIP_INFLATE",
          `${entry.name}:`
          + `${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (decoded.length !== entry.uncompressedSize) {
      throw zipError("ZIP_SIZE_MISMATCH", entry.name);
    }
    if (crc32(decoded) !== entry.checksum) {
      throw zipError("ZIP_CRC", entry.name);
    }
    output.set(entry.name, Buffer.from(decoded));
  }
  return output;
}
