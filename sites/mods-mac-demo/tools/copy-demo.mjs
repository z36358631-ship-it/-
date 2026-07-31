import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const demoSource = resolve(projectRoot, "../../demos/Mod与发行人/Mod功能Mac端demo.html");
const publicDirectory = resolve(projectRoot, "public");
const demoTarget = resolve(publicDirectory, "demo.html");

await stat(demoSource);
await mkdir(publicDirectory, { recursive: true });
await copyFile(demoSource, demoTarget);

console.log("Prepared public/demo.html from the committed Mac Demo.");
