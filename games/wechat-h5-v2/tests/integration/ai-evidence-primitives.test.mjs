import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { describe, it } from "node:test";
import sharp from "sharp";

import {
  validatePngEvidence as validatePngEvidenceApi,
} from "../../tools/ai-playtest/png-evidence.mjs";
import {
  readBoundedZip,
} from "../../tools/ai-playtest/zip-evidence.mjs";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const PNG_PATH = "screens/entry.png";

function validatePngEvidence(bytes, options) {
  return validatePngEvidenceApi(bytes, PNG_PATH, options);
}

function validateZipEvidence(bytes, options = {}) {
  const formalOptions = {
    ...(options.maxEntries === undefined
      ? {}
      : { maxEntries: options.maxEntries }),
    ...(options.maxEntryUncompressedBytes === undefined
      && options.maxEntryCompressedBytes === undefined
      ? {}
      : {
          maxEntryBytes: Math.min(
            options.maxEntryUncompressedBytes ?? Number.MAX_SAFE_INTEGER,
            options.maxEntryCompressedBytes ?? Number.MAX_SAFE_INTEGER,
          ),
        }),
    ...(options.maxTotalUncompressedBytes === undefined
      && options.maxArchiveBytes === undefined
      ? {}
      : {
          maxTotalBytes: Math.min(
            options.maxTotalUncompressedBytes ?? Number.MAX_SAFE_INTEGER,
            options.maxArchiveBytes ?? Number.MAX_SAFE_INTEGER,
          ),
        }),
    ...(options.maxCompressionRatio === undefined
      ? {}
      : { maxCompressionRatio: options.maxCompressionRatio }),
  };
  return Promise.resolve().then(() => readBoundedZip(bytes, formalOptions));
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, "ascii");
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  typeBytes.copy(header, 4);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([header, data, checksum]);
}

function extractPngChunks(bytes) {
  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const end = offset + 12 + length;
    chunks.push({
      type,
      data: Buffer.from(bytes.subarray(offset + 8, offset + 8 + length)),
    });
    offset = end;
    if (type === "IEND") break;
  }
  return chunks;
}

function buildPng(chunks, tail = Buffer.alloc(0)) {
  return Buffer.concat([
    PNG_SIGNATURE,
    ...chunks.map(({ type, data }) => pngChunk(type, data)),
    tail,
  ]);
}

async function validPng(channels = 4) {
  return sharp({
    create: {
      width: 390,
      height: 844,
      channels,
      background: channels === 4
        ? { r: 12, g: 34, b: 56, alpha: 1 }
        : { r: 12, g: 34, b: 56 },
    },
  }).png().toBuffer();
}

function rawName(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
}

function extraField(id, data = Buffer.alloc(0)) {
  const header = Buffer.alloc(4);
  header.writeUInt16LE(id, 0);
  header.writeUInt16LE(data.length, 2);
  return Buffer.concat([header, data]);
}

function makeZip(entries, {
  comment = Buffer.alloc(0),
  eocd = {},
} = {}) {
  const localParts = [];
  const centralEntries = [];
  let localOffset = 0;
  for (const source of entries) {
    const name = rawName(source.name);
    const localName = rawName(source.localName ?? source.name);
    const data = Buffer.from(source.data ?? "");
    const method = source.method ?? 0;
    const flags = source.flags ?? 0x0800;
    const compressed = source.compressed ?? (
      method === 8 ? deflateRawSync(data) : data
    );
    const checksum = source.crc ?? crc32(data);
    const compressedSize = source.compressedSize ?? compressed.length;
    const uncompressedSize = source.uncompressedSize ?? data.length;
    const localExtra = source.localExtra ?? Buffer.alloc(0);
    const centralExtra = source.centralExtra ?? Buffer.alloc(0);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(source.versionNeeded ?? 20, 4);
    local.writeUInt16LE(source.localFlags ?? flags, 6);
    local.writeUInt16LE(source.localMethod ?? method, 8);
    local.writeUInt32LE(source.localCrc ?? checksum, 14);
    local.writeUInt32LE(
      source.localCompressedSize ?? compressedSize,
      18,
    );
    local.writeUInt32LE(
      source.localUncompressedSize ?? uncompressedSize,
      22,
    );
    local.writeUInt16LE(localName.length, 26);
    local.writeUInt16LE(localExtra.length, 28);
    localParts.push(local, localName, localExtra, compressed);

    centralEntries.push({
      source,
      name,
      flags,
      method,
      checksum,
      compressedSize,
      uncompressedSize,
      centralExtra,
      localOffset,
    });
    localOffset += (
      local.length
      + localName.length
      + localExtra.length
      + compressed.length
    );
  }

  const centralParts = [];
  for (const entry of centralEntries) {
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(entry.source.versionMadeBy ?? 0x0314, 4);
    central.writeUInt16LE(entry.source.versionNeeded ?? 20, 6);
    central.writeUInt16LE(entry.flags, 8);
    central.writeUInt16LE(entry.method, 10);
    central.writeUInt32LE(entry.checksum, 16);
    central.writeUInt32LE(entry.compressedSize, 20);
    central.writeUInt32LE(entry.uncompressedSize, 24);
    central.writeUInt16LE(entry.name.length, 28);
    central.writeUInt16LE(entry.centralExtra.length, 30);
    central.writeUInt32LE(entry.source.externalAttributes ?? 0, 38);
    central.writeUInt32LE(
      entry.source.localOffsetOverride ?? entry.localOffset,
      42,
    );
    centralParts.push(central, entry.name, entry.centralExtra);
  }
  const centralBytes = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(eocd.diskNumber ?? 0, 4);
  end.writeUInt16LE(eocd.centralDisk ?? 0, 6);
  end.writeUInt16LE(eocd.entriesOnDisk ?? entries.length, 8);
  end.writeUInt16LE(eocd.entryCount ?? entries.length, 10);
  end.writeUInt32LE(eocd.centralSize ?? centralBytes.length, 12);
  end.writeUInt32LE(eocd.centralOffset ?? localOffset, 16);
  end.writeUInt16LE(eocd.commentLength ?? comment.length, 20);
  return Buffer.concat([...localParts, centralBytes, end, comment]);
}

function findEocd(bytes) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

const STORED_ENTRY = Object.freeze({
  name: "trace.trace",
  data: "{\"type\":\"context-options\"}\n",
  method: 0,
  flags: 0,
});
const DEFLATED_ENTRY = Object.freeze({
  name: "resources/source.txt",
  data: "fixture source\n".repeat(8),
  method: 8,
});

describe("strict PNG evidence primitive", () => {
  it("requires a safe relative path and uses it in AI_PLAYTEST errors", async () => {
    const bytes = await validPng();
    await assert.rejects(
      validatePngEvidenceApi(bytes),
      /AI_PLAYTEST_PNG_PATH/u,
    );
    for (const unsafePath of [
      "",
      "/absolute.png",
      "C:/drive.png",
      String.raw`screens\entry.png`,
      "../entry.png",
      "screens//entry.png",
    ]) {
      await assert.rejects(
        validatePngEvidenceApi(bytes, unsafePath),
        /AI_PLAYTEST_PNG_PATH/u,
      );
    }
    const badSignature = Buffer.from(bytes);
    badSignature[0] ^= 0xff;
    await assert.rejects(
      validatePngEvidenceApi(badSignature, PNG_PATH),
      (error) => error?.message
        === `AI_PLAYTEST_PNG_SIGNATURE:${PNG_PATH}`,
    );
  });

  it("accepts sharp-generated 8-bit RGB and RGBA 390x844 PNGs", async () => {
    for (const channels of [3, 4]) {
      const bytes = await validPng(channels);
      const result = await validatePngEvidence(bytes);
      assert.deepEqual(
        { width: result.width, height: result.height, channels: result.channels },
        { width: 390, height: 844, channels },
      );
      assert.equal(result.decodedBytes > 0, true);
      assert.equal(result.idatChunks >= 1, true);
    }
  });

  it("validates expected dimensions and byte limits as safe integers", async () => {
    const bytes = await validPng();
    for (const options of [
      { width: 0 },
      { height: -1 },
      { maxBytes: 0 },
      { width: Number.MAX_SAFE_INTEGER, height: 2 },
      { width: 390.5 },
    ]) {
      await assert.rejects(
        validatePngEvidenceApi(bytes, PNG_PATH, options),
        /AI_PLAYTEST_PNG_OPTIONS/u,
      );
    }
  });

  it("rejects size, signature, truncation, overflow, and trailing bytes", async () => {
    const bytes = await validPng();
    const badSignature = Buffer.from(bytes);
    badSignature[0] ^= 0xff;
    const overflow = Buffer.from(bytes);
    overflow.writeUInt32BE(0xffffffff, 8);
    for (const [candidate, code] of [
      [Buffer.alloc(8 * 1024 * 1024 + 1), "PNG_SIZE"],
      [badSignature, "PNG_SIGNATURE"],
      [bytes.subarray(0, bytes.length - 1), "PNG_TRUNCATED"],
      [overflow, "PNG_CHUNK_LENGTH"],
      [Buffer.concat([bytes, Buffer.from("tail")]), "PNG_TRAILING_BYTES"],
    ]) {
      await assert.rejects(
        validatePngEvidence(candidate),
        new RegExp(code, "u"),
      );
    }
  });

  it("checks every chunk type and CRC", async () => {
    const bytes = await validPng();
    const chunks = extractPngChunks(bytes);
    const badType = Buffer.from(bytes);
    badType[12] = 0x31;
    const badCrc = Buffer.from(bytes);
    badCrc[29] ^= 0xff;
    await assert.rejects(
      validatePngEvidence(badType),
      /PNG_CHUNK_TYPE/u,
    );
    await assert.rejects(
      validatePngEvidence(badCrc),
      /PNG_CRC/u,
    );
    await assert.rejects(
      validatePngEvidence(buildPng([
        chunks[0],
        { type: "texT", data: Buffer.alloc(0) },
        ...chunks.slice(1),
      ])),
      /PNG_CHUNK_TYPE/u,
    );
  });

  it("requires one 13-byte first IHDR with exact dimensions", async () => {
    const chunks = extractPngChunks(await validPng());
    const ihdr = chunks.find(({ type }) => type === "IHDR");
    const idats = chunks.filter(({ type }) => type === "IDAT");
    const iend = chunks.find(({ type }) => type === "IEND");
    const wrongDimensions = Buffer.from(ihdr.data);
    wrongDimensions.writeUInt32BE(391, 0);
    for (const [candidate, code] of [
      [buildPng([...idats, ihdr, iend]), "PNG_IHDR_FIRST"],
      [buildPng([ihdr, ihdr, ...idats, iend]), "PNG_IHDR_DUPLICATE"],
      [
        buildPng([
          { type: "IHDR", data: ihdr.data.subarray(0, 12) },
          ...idats,
          iend,
        ]),
        "PNG_IHDR_LENGTH",
      ],
      [
        buildPng([
          { type: "IHDR", data: wrongDimensions },
          ...idats,
          iend,
        ]),
        "PNG_DIMENSIONS",
      ],
    ]) {
      await assert.rejects(
        validatePngEvidence(candidate),
        new RegExp(code, "u"),
      );
    }
  });

  it("accepts only non-interlaced 8-bit RGB or RGBA IHDR formats", async () => {
    const chunks = extractPngChunks(await validPng());
    const ihdrIndex = chunks.findIndex(({ type }) => type === "IHDR");
    for (const mutate of [
      (ihdr) => { ihdr[8] = 16; },
      (ihdr) => { ihdr[9] = 3; },
      (ihdr) => { ihdr[9] = 0; },
      (ihdr) => { ihdr[12] = 1; },
      (ihdr) => { ihdr[8] = 4; ihdr[9] = 2; },
    ]) {
      const candidateChunks = chunks.map(({ type, data }) => ({
        type,
        data: Buffer.from(data),
      }));
      mutate(candidateChunks[ihdrIndex].data);
      await assert.rejects(
        validatePngEvidence(buildPng(candidateChunks)),
        /AI_PLAYTEST_PNG_IHDR_FORMAT/u,
      );
    }
  });

  it("rejects dangerous or unsupported metadata chunks", async () => {
    const chunks = extractPngChunks(await validPng());
    const ihdr = chunks.find(({ type }) => type === "IHDR");
    const rest = chunks.filter(({ type }) => type !== "IHDR");
    for (const type of ["iCCP", "zTXt", "tEXt"]) {
      await assert.rejects(
        validatePngEvidence(buildPng([
          ihdr,
          { type, data: Buffer.from("metadata") },
          ...rest,
        ])),
        /AI_PLAYTEST_PNG_METADATA/u,
      );
    }
  });

  it("requires sharp raw channels to agree with IHDR colorType", async () => {
    const bytes = await validPng(3);
    const fakeSharp = () => ({
      raw: () => ({
        toBuffer: async () => ({
          data: Buffer.alloc(390 * 844 * 4),
          info: { width: 390, height: 844, channels: 4 },
        }),
      }),
    });
    await assert.rejects(
      validatePngEvidenceApi(bytes, PNG_PATH, { sharpImpl: fakeSharp }),
      /AI_PLAYTEST_PNG_DECODE_CHANNELS/u,
    );
  });

  it("requires ordered critical chunks, contiguous IDAT, and terminal IEND", async () => {
    const chunks = extractPngChunks(await validPng());
    const ihdr = chunks.find(({ type }) => type === "IHDR");
    const idatData = Buffer.concat(
      chunks.filter(({ type }) => type === "IDAT").map(({ data }) => data),
    );
    const midpoint = Math.max(1, Math.floor(idatData.length / 2));
    const firstIdat = { type: "IDAT", data: idatData.subarray(0, midpoint) };
    const secondIdat = { type: "IDAT", data: idatData.subarray(midpoint) };
    const iend = { type: "IEND", data: Buffer.alloc(0) };
    for (const [candidate, code] of [
      [buildPng([ihdr, iend]), "PNG_IDAT_REQUIRED"],
      [
        buildPng([
          ihdr,
          firstIdat,
          { type: "pHYs", data: Buffer.alloc(9) },
          secondIdat,
          iend,
        ]),
        "PNG_IDAT_ORDER",
      ],
      [
        buildPng([
          ihdr,
          firstIdat,
          { type: "PLTE", data: Buffer.from([0, 0, 0]) },
          iend,
        ]),
        "PNG_PLTE_ORDER",
      ],
      [
        buildPng([
          ihdr,
          { type: "PLTE", data: Buffer.from([0, 0, 0]) },
          { type: "PLTE", data: Buffer.from([1, 1, 1]) },
          firstIdat,
          secondIdat,
          iend,
        ]),
        "PNG_PLTE_DUPLICATE",
      ],
      [
        buildPng([
          ihdr,
          { type: "ABCD", data: Buffer.alloc(0) },
          firstIdat,
          secondIdat,
          iend,
        ]),
        "PNG_CRITICAL_CHUNK",
      ],
      [
        buildPng([
          ihdr,
          firstIdat,
          secondIdat,
          { type: "IEND", data: Buffer.from([0]) },
        ]),
        "PNG_IEND_LENGTH",
      ],
      [
        buildPng([ihdr, firstIdat, secondIdat, iend, iend]),
        "PNG_TRAILING_BYTES",
      ],
    ]) {
      await assert.rejects(
        validatePngEvidence(candidate),
        new RegExp(code, "u"),
      );
    }
  });

  it("requires sharp to fully decode non-empty raw pixels", async () => {
    const chunks = extractPngChunks(await validPng());
    const corrupt = chunks.map((chunk) => (
      chunk.type === "IDAT"
        ? { type: "IDAT", data: Buffer.from("not-deflate") }
        : chunk
    ));
    await assert.rejects(
      validatePngEvidence(buildPng(corrupt)),
      /PNG_DECODE/u,
    );
  });
});

describe("strict ZIP evidence primitive", () => {
  it("synchronously returns one Map of stored and inflated entry Buffers", () => {
    const bytes = makeZip(
      [STORED_ENTRY, DEFLATED_ENTRY],
      { comment: Buffer.from("PK\u0005\u0006 bounded comment") },
    );
    const result = readBoundedZip(bytes);
    assert.equal(result instanceof Map, true);
    assert.equal(result.size, 2);
    assert.deepEqual(
      result.get("trace.trace"),
      Buffer.from(STORED_ENTRY.data),
    );
    assert.deepEqual(
      result.get("resources/source.txt"),
      Buffer.from(DEFLATED_ENTRY.data),
    );
    assert.equal(
      readBoundedZip(bytes, { maxCompressionRatio: 100 }).size,
      2,
    );
    assert.equal(
      readBoundedZip(bytes, { maxCompressionRatio: 200 }).size,
      2,
    );
  });

  it("rejects SFX, truncation, malformed EOCD comments, and multi-disk ZIPs", async () => {
    const valid = makeZip([STORED_ENTRY]);
    assert.throws(
      () => readBoundedZip(Buffer.concat([Buffer.from("MZ"), valid])),
      (error) => error?.message === "AI_PLAYTEST_ZIP_SFX",
    );
    const malformedComment = Buffer.from(valid);
    malformedComment.writeUInt16LE(1, findEocd(malformedComment) + 20);
    for (const [candidate, code] of [
      [Buffer.concat([Buffer.from("MZ"), valid]), "ZIP_SFX"],
      [valid.subarray(0, valid.length - 1), "ZIP_EOCD"],
      [malformedComment, "ZIP_EOCD"],
      [
        makeZip([STORED_ENTRY], { eocd: { diskNumber: 1 } }),
        "ZIP_MULTIDISK",
      ],
    ]) {
      await assert.rejects(
        validateZipEvidence(candidate),
        new RegExp(code, "u"),
      );
    }
  });

  it("rejects ZIP64, encryption, descriptors, flags, and methods", async () => {
    for (const [candidate, code] of [
      [
        makeZip([STORED_ENTRY], { eocd: { entryCount: 0xffff } }),
        "ZIP64",
      ],
      [
        makeZip([STORED_ENTRY], {
          eocd: { entriesOnDisk: 0xffff },
        }),
        "ZIP64",
      ],
      [makeZip([{ ...STORED_ENTRY, flags: 0x0801 }]), "ZIP_ENCRYPTED"],
      [makeZip([{ ...STORED_ENTRY, flags: 0x0808 }]), "ZIP_DESCRIPTOR"],
      [makeZip([{ ...STORED_ENTRY, flags: 0x0002 }]), "ZIP_FLAGS"],
      [makeZip([{ ...STORED_ENTRY, flags: 0x1000 }]), "ZIP_FLAGS"],
      [makeZip([{ ...STORED_ENTRY, method: 12 }]), "ZIP_METHOD"],
      [
        makeZip([{
          ...STORED_ENTRY,
          centralExtra: extraField(0x0001, Buffer.alloc(8)),
        }]),
        "ZIP64",
      ],
    ]) {
      await assert.rejects(
        validateZipEvidence(candidate),
        new RegExp(code, "u"),
      );
    }
  });

  it("rejects ambiguous names and every unsafe path shape", async () => {
    const unsafeNames = [
      Buffer.from([0x80]),
      "/absolute",
      "C:/drive",
      "//server/share",
      String.raw`dir\file`,
      "nul\u0000byte",
      ".",
      "..",
      "dir/./file",
      "dir/../file",
      "dir//file",
      "dir/",
      "",
    ];
    for (const name of unsafeNames) {
      await assert.rejects(
        validateZipEvidence(makeZip([{
          name,
          data: "x",
          flags: Buffer.isBuffer(name) ? 0 : 0x0800,
        }])),
        /ZIP_(?:NAME_ENCODING|PATH)/u,
      );
    }
  });

  it("rejects raw, decoded, and POSIX-normalized duplicate names", async () => {
    for (const entries of [
      [
        { name: "same.txt", data: "a" },
        { name: "same.txt", data: "b" },
      ],
      [
        { name: "a/b.txt", data: "a" },
        { name: "a/./b.txt", data: "b" },
      ],
    ]) {
      await assert.rejects(
        validateZipEvidence(makeZip(entries)),
        /ZIP_DUPLICATE/u,
      );
    }
  });

  it("rejects unsafe external attributes across creator systems", async () => {
    for (const [externalAttributes, versionMadeBy] of [
      [0x41ed0000, 0x0314],
      [0xa1ff0000, 0x0314],
      [0x21b60000, 0x0314],
      [0x00000008, 0x0014],
      [0x00000010, 0x0014],
      [0x00000400, 0x0014],
      [0xa1ff0000, 0x0014],
    ]) {
      await assert.rejects(
        validateZipEvidence(makeZip([{
          ...STORED_ENTRY,
          externalAttributes,
          versionMadeBy,
        }])),
        /ZIP_ENTRY_TYPE/u,
      );
    }
  });

  it("rejects CRC, size, method, flags, and local-name mismatches", async () => {
    for (const [entry, code] of [
      [{ ...STORED_ENTRY, crc: 1 }, "ZIP_CRC"],
      [
        { ...STORED_ENTRY, localUncompressedSize: 1 },
        "ZIP_HEADER_MISMATCH",
      ],
      [
        { ...STORED_ENTRY, localMethod: 8 },
        "ZIP_HEADER_MISMATCH",
      ],
      [
        { ...STORED_ENTRY, localFlags: 0x0800 },
        "ZIP_HEADER_MISMATCH",
      ],
      [
        { ...STORED_ENTRY, localName: "other.trace" },
        "ZIP_HEADER_MISMATCH",
      ],
    ]) {
      await assert.rejects(
        validateZipEvidence(makeZip([entry])),
        new RegExp(code, "u"),
      );
    }
  });

  it("rejects local overlaps and pointers into the central directory", async () => {
    const overlap = makeZip([
      STORED_ENTRY,
      { ...DEFLATED_ENTRY, localOffsetOverride: 0 },
    ]);
    const centralPointer = makeZip([STORED_ENTRY]);
    const eocdOffset = findEocd(centralPointer);
    const centralOffset = centralPointer.readUInt32LE(eocdOffset + 16);
    centralPointer.writeUInt32LE(centralOffset, centralOffset + 42);
    await assert.rejects(
      validateZipEvidence(overlap),
      /ZIP_LOCAL_OVERLAP/u,
    );
    await assert.rejects(
      validateZipEvidence(centralPointer),
      /ZIP_LOCAL_POINTER/u,
    );
  });

  it("enforces archive, entry, total, count, and compression-ratio limits", async () => {
    const twoEntries = makeZip([STORED_ENTRY, DEFLATED_ENTRY]);
    assert.throws(
      () => readBoundedZip(twoEntries, { maxEntries: 1 }),
      /AI_PLAYTEST_ZIP_ENTRY_COUNT/u,
    );
    assert.throws(
      () => readBoundedZip(twoEntries, { maxEntryBytes: 16 }),
      /AI_PLAYTEST_ZIP_ENTRY_SIZE/u,
    );
    assert.throws(
      () => readBoundedZip(twoEntries, { maxTotalBytes: 32 }),
      /AI_PLAYTEST_ZIP_TOTAL_SIZE/u,
    );
    await assert.rejects(
      validateZipEvidence(twoEntries, { maxEntries: 1 }),
      /ZIP_ENTRY_COUNT/u,
    );
    await assert.rejects(
      validateZipEvidence(twoEntries, { maxArchiveBytes: 32 }),
      /ZIP_TOTAL_SIZE/u,
    );
    await assert.rejects(
      validateZipEvidence(twoEntries, { maxEntryUncompressedBytes: 16 }),
      /ZIP_ENTRY_SIZE/u,
    );
    await assert.rejects(
      validateZipEvidence(twoEntries, { maxEntryCompressedBytes: 4 }),
      /ZIP_ENTRY_SIZE/u,
    );
    await assert.rejects(
      validateZipEvidence(twoEntries, { maxTotalUncompressedBytes: 32 }),
      /ZIP_TOTAL_SIZE/u,
    );
    await assert.rejects(
      validateZipEvidence(makeZip([{
        name: "bomb.txt",
        data: "A".repeat(10_000),
        method: 8,
      }]), { maxCompressionRatio: 2 }),
      /ZIP_RATIO/u,
    );
  });

  it("rejects unicode path traversal and unsupported semantic extras", async () => {
    for (const id of [0x7075, 0x6375, 0xcafe]) {
      const payload = id === 0x7075
        ? Buffer.from("../escape")
        : Buffer.from([1, 2]);
      await assert.rejects(
        validateZipEvidence(makeZip([{
          ...STORED_ENTRY,
          centralExtra: extraField(id, payload),
        }])),
        /AI_PLAYTEST_ZIP_EXTRA/u,
      );
    }
    await assert.rejects(
      validateZipEvidence(makeZip([{
        ...STORED_ENTRY,
        centralExtra: Buffer.from([0xfe, 0xca, 0x04, 0x00, 0x01]),
      }])),
      /ZIP_EXTRA/u,
    );
    await assert.rejects(
      validateZipEvidence(makeZip([{
        ...STORED_ENTRY,
        localExtra: Buffer.from([0xfe, 0xca, 0x04, 0x00, 0x01]),
      }])),
      /ZIP_EXTRA/u,
    );
  });
});
