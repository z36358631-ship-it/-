import path from "node:path";
import sharp from "sharp";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return value >>> 0;
});

function printablePath(value) {
  return String(value ?? "<missing>")
    .replace(/[^\x20-\x7e]/gu, "?")
    .slice(0, 512);
}

function pngError(code, relativePath, detail = "") {
  const error = new Error(
    `AI_PLAYTEST_${code}:${printablePath(relativePath)}`
    + `${detail ? `:${detail}` : ""}`,
  );
  error.code = `AI_PLAYTEST_${code}`;
  return error;
}

function safeRelativePath(value) {
  const label = printablePath(value);
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > 512
    || value.includes("\\")
    || value.includes("\0")
    || value.startsWith("/")
    || /^[A-Za-z]:/u.test(value)
    || path.posix.normalize(value) !== value
    || value.split("/").some((segment) => (
      segment === "" || segment === "." || segment === ".."
    ))
  ) {
    throw pngError("PNG_PATH", label);
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

function positiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export async function validatePngEvidence(
  value,
  relativePath,
  options = {},
) {
  const safePath = safeRelativePath(relativePath);
  const fail = (code, detail = "") => pngError(code, safePath, detail);
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw fail("PNG_OPTIONS");
  }
  const {
    width: expectedWidth = 390,
    height: expectedHeight = 844,
    maxBytes = DEFAULT_MAX_BYTES,
    sharpImpl = sharp,
  } = options;
  if (
    !positiveSafeInteger(expectedWidth)
    || !positiveSafeInteger(expectedHeight)
    || !positiveSafeInteger(maxBytes)
    || expectedWidth > Math.floor(Number.MAX_SAFE_INTEGER / expectedHeight)
    || expectedWidth * expectedHeight
      > Math.floor(Number.MAX_SAFE_INTEGER / 4)
    || typeof sharpImpl !== "function"
  ) {
    throw fail("PNG_OPTIONS");
  }
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw fail("PNG_INPUT");
  }
  const bytes = Buffer.from(
    value.buffer,
    value.byteOffset,
    value.byteLength,
  );
  if (bytes.length > maxBytes) {
    throw fail("PNG_SIZE", String(bytes.length));
  }
  if (
    bytes.length < PNG_SIGNATURE.length
    || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw fail("PNG_SIGNATURE");
  }

  let offset = PNG_SIGNATURE.length;
  let chunkIndex = 0;
  let ihdrSeen = false;
  let plteSeen = false;
  let physSeen = false;
  let metadataOrderInvalid = false;
  let idatChunks = 0;
  let idatEnded = false;
  let iendSeen = false;
  let width = null;
  let height = null;
  let colorType = null;
  let expectedChannels = null;

  while (offset < bytes.length) {
    if (iendSeen) throw fail("PNG_TRAILING_BYTES");
    if (bytes.length - offset < 12) throw fail("PNG_TRUNCATED");
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) {
      throw fail("PNG_CHUNK_LENGTH", String(length));
    }
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    const nextOffset = crcOffset + 4;
    const typeBytes = bytes.subarray(typeStart, dataStart);
    const type = typeBytes.toString("ascii");
    if (
      !/^[A-Za-z]{4}$/u.test(type)
      || type[2] !== type[2].toUpperCase()
    ) {
      throw fail("PNG_CHUNK_TYPE", type);
    }
    if (crc32(bytes.subarray(typeStart, dataEnd))
      !== bytes.readUInt32BE(crcOffset)) {
      throw fail("PNG_CRC", type);
    }
    if (chunkIndex === 0 && type !== "IHDR") {
      throw fail("PNG_IHDR_FIRST");
    }

    if (type === "IHDR") {
      if (ihdrSeen) throw fail("PNG_IHDR_DUPLICATE");
      if (chunkIndex !== 0) throw fail("PNG_IHDR_FIRST");
      if (length !== 13) throw fail("PNG_IHDR_LENGTH");
      ihdrSeen = true;
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      const bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      const compression = bytes[dataStart + 10];
      const filter = bytes[dataStart + 11];
      const interlace = bytes[dataStart + 12];
      if (width !== expectedWidth || height !== expectedHeight) {
        throw fail("PNG_DIMENSIONS", `${width}x${height}`);
      }
      if (
        bitDepth !== 8
        || (colorType !== 2 && colorType !== 6)
        || compression !== 0
        || filter !== 0
        || interlace !== 0
      ) {
        throw fail("PNG_IHDR_FORMAT", `${bitDepth}:${colorType}`);
      }
      expectedChannels = colorType === 2 ? 3 : 4;
    } else if (type === "PLTE") {
      if (plteSeen) throw fail("PNG_PLTE_DUPLICATE");
      if (!ihdrSeen || idatChunks > 0) throw fail("PNG_PLTE_ORDER");
      plteSeen = true;
    } else if (type === "IDAT") {
      if (!ihdrSeen || idatEnded) throw fail("PNG_IDAT_ORDER");
      idatChunks += 1;
    } else if (type === "IEND") {
      if (iendSeen) throw fail("PNG_IEND_DUPLICATE");
      if (length !== 0) throw fail("PNG_IEND_LENGTH");
      if (idatChunks < 1) throw fail("PNG_IDAT_REQUIRED");
      iendSeen = true;
    } else if (type === "pHYs") {
      if (physSeen || length !== 9) throw fail("PNG_METADATA", type);
      physSeen = true;
      if (idatChunks > 0) {
        idatEnded = true;
        metadataOrderInvalid = true;
      }
    } else if (type[0] === type[0].toUpperCase()) {
      throw fail("PNG_CRITICAL_CHUNK", type);
    } else {
      throw fail("PNG_METADATA", type);
    }

    offset = nextOffset;
    chunkIndex += 1;
    if (iendSeen && offset !== bytes.length) {
      throw fail("PNG_TRAILING_BYTES");
    }
  }
  if (!ihdrSeen) throw fail("PNG_IHDR_FIRST");
  if (idatChunks < 1) throw fail("PNG_IDAT_REQUIRED");
  if (!iendSeen) throw fail("PNG_IEND_REQUIRED");
  if (metadataOrderInvalid) throw fail("PNG_METADATA_ORDER", "pHYs");

  let decoded;
  try {
    decoded = await sharpImpl(bytes, {
      failOn: "error",
      limitInputPixels: expectedWidth * expectedHeight,
    }).raw().toBuffer({ resolveWithObject: true });
  } catch (error) {
    throw fail(
      "PNG_DECODE",
      error instanceof Error ? error.message : String(error),
    );
  }
  const decodedBytes = decoded?.data?.byteLength ?? 0;
  const info = decoded?.info;
  if (
    !info
    || info.width !== expectedWidth
    || info.height !== expectedHeight
    || decodedBytes < 1
    || decodedBytes !== info.width * info.height * info.channels
  ) {
    throw fail("PNG_DECODE_EMPTY");
  }
  if (info.channels !== expectedChannels) {
    throw fail(
      "PNG_DECODE_CHANNELS",
      `${colorType}:${info.channels}`,
    );
  }
  return Object.freeze({
    width,
    height,
    channels: info.channels,
    byteLength: bytes.length,
    chunkCount: chunkIndex,
    idatChunks,
    decodedBytes,
  });
}
