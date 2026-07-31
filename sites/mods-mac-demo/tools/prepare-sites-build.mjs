import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const serverEntry = resolve(projectRoot, "dist/server/index.js");
const hostingSource = resolve(projectRoot, "../../.openai/hosting.json");
const hostingDirectory = resolve(projectRoot, "dist/.openai");
const hostingTarget = resolve(hostingDirectory, "hosting.json");

await stat(serverEntry);
await stat(hostingSource);
await mkdir(hostingDirectory, { recursive: true });
await copyFile(hostingSource, hostingTarget);

console.log("Prepared Sites artifact: dist/server/index.js + dist/.openai/hosting.json");
