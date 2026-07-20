import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotRoot = path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP');

const candidates = {
  logo: ['gw_logo.svg'],
  home: ['20260717-home.jpg', '20260618-120632.jpg'],
  checkin: ['20260717-checkin.jpg', '20260521-152127.jpg'],
  queue: ['20260717-queue.jpg', '20260521-152120.jpg'],
  startFirmware: ['20260717-start-firmware.jpg', 'img_v3_02123_f6189d96-6d89-4fb9-97c5-0e4172914d1g.jpg'],
  startClient: ['20260717-start-client.jpg', '20260602-155758.jpg', 'img_v3_02123_f6189d96-6d89-4fb9-97c5-0e4172914d1g.jpg'],
  libraryLandscape: ['20260717-game-library-gta5.jpg', '20260521-152120.jpg'],
  playLandscape: ['20260521-152127.jpg'],
  homeLandscape: ['20260525-152930.jpg'],
};

const mime = file => file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : 'image/jpeg';

function resolveAsset(names) {
  for (const name of names) {
    const file = path.join(shotRoot, name);
    if (fs.existsSync(file)) return { file, name, preferred: name === names[0] };
  }
  throw new Error(`Missing Android ad demo asset. Tried: ${names.join(', ')}`);
}

export function loadAssets() {
  return Object.fromEntries(Object.entries(candidates).map(([key, names]) => {
    const hit = resolveAsset(names);
    const data = fs.readFileSync(hit.file).toString('base64');
    return [key, {
      src: `data:${mime(hit.file)};base64,${data}`,
      source: hit.name,
      preferred: hit.preferred,
    }];
  }));
}

export { candidates, root, shotRoot };
