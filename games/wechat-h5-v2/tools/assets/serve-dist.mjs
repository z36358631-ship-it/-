import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const root = path.resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/hub/";
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
    const finalInfo = await stat(file);
    response.writeHead(200, {
      "content-type":
        mime[path.extname(file)] ?? "application/octet-stream",
      "content-length": finalInfo.size,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end("Not Found");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`DIST_SERVER_READY http://127.0.0.1:${port}\n`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
