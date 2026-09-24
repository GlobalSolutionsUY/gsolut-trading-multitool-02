import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIRS = ['dist', 'build', '.turbo', 'coverage'];
const ROOT_DIR = process.cwd();

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    console.log(`Removing: ${dir}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Clean in apps and packages
for (const sub of ['apps', 'packages']) {
  const fullSub = path.join(ROOT_DIR, sub);
  if (fs.existsSync(fullSub)) {
    const entries = fs.readdirSync(fullSub, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        for (const target of TARGET_DIRS) {
          cleanDir(path.join(fullSub, entry.name, target));
        }
      }
    }
  }
}

// Clean root targets
for (const target of TARGET_DIRS) {
  cleanDir(path.join(ROOT_DIR, target));
}

console.log('Clean complete.');
