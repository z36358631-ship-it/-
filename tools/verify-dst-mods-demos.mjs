import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateStandaloneDemo,
  validateSharedContract
} from './lib/dst-mods-demo-validator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = {
  mac: path.join(root, 'demos', 'Mod与发行人', 'Mod功能Mac端demo.html'),
  app: path.join(root, 'demos', 'Mod与发行人', 'Mod功能APP端demo.html'),
  scene: path.join(root, 'demos', 'Mod与发行人', 'Mod功能APP端-场景联动demo.html')
};

const only = process.argv.find(arg => arg.startsWith('--only='))?.split('=')[1];
const selected = only ? [entries[only]] : Object.values(entries);
if (selected.some(file => !file)) throw new Error(`Unknown --only value: ${only}`);

const errors = [];
for (const file of selected) errors.push(...await validateStandaloneDemo(file));
if (!only) errors.push(...await validateSharedContract(selected));

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`PASS DST MODS demos: ${only ?? 'all'}`);
}
