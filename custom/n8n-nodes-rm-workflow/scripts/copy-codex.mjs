import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = join(root, 'src');
const distRoot = join(root, 'dist');

function walk(dir) {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) {
			walk(full);
			continue;
		}
		if (!name.endsWith('.node.json')) continue;
		const rel = full.slice(srcRoot.length + 1);
		const dest = join(distRoot, rel);
		mkdirSync(dirname(dest), { recursive: true });
		copyFileSync(full, dest);
	}
}

walk(srcRoot);
console.log('Copied .node.json codex files to dist/');
