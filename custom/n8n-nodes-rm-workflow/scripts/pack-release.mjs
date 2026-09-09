/**
 * Pack a standalone release folder for N8N_CUSTOM_EXTENSIONS.
 *
 * Source (dev):  custom/n8n-nodes-rm-workflow  — edit / pnpm build freely
 * Release (prod): ../n8n-custom-extensions/n8n-nodes-rm-workflow — only updated by this script
 *
 * Usage:
 *   node scripts/pack-release.mjs
 *   node scripts/pack-release.mjs --skip-build
 *   RM_NODES_RELEASE_DIR=D:/path/to/folder node scripts/pack-release.mjs
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const skipBuild = process.argv.includes('--skip-build');

const defaultReleaseRoot = path.resolve(pkgRoot, '..', '..', '..', 'n8n-custom-extensions');
const releaseRoot = process.env.RM_NODES_RELEASE_DIR
	? path.resolve(process.env.RM_NODES_RELEASE_DIR)
	: path.join(defaultReleaseRoot, 'n8n-nodes-rm-workflow');

const AXIOS_VERSION = '1.18.0';

function log(msg) {
	console.log(`[pack-release] ${msg}`);
}

function buildPackageJson(srcPkg) {
	return {
		name: srcPkg.name,
		version: srcPkg.version,
		description: srcPkg.description,
		license: srcPkg.license,
		keywords: srcPkg.keywords,
		files: ['dist'],
		n8n: srcPkg.n8n,
		dependencies: {
			axios: AXIOS_VERSION,
		},
		peerDependencies: {
			'n8n-workflow': '*',
		},
	};
}

if (!skipBuild) {
	log('Building source package…');
	execSync('pnpm build', { cwd: pkgRoot, stdio: 'inherit' });
} else {
	log('Skipping build (--skip-build)');
}

const distDir = path.join(pkgRoot, 'dist');
if (!existsSync(distDir)) {
	console.error(`[pack-release] Missing dist/. Run pnpm build first.`);
	process.exit(1);
}

const srcPkg = JSON.parse(readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
const staging = mkdtempSync(path.join(tmpdir(), 'rm-nodes-pack-'));

try {
	log(`Staging → ${staging}`);
	cpSync(distDir, path.join(staging, 'dist'), { recursive: true });
	writeFileSync(
		path.join(staging, 'package.json'),
		JSON.stringify(buildPackageJson(srcPkg), null, 2) + '\n',
		'utf8',
	);

	log('npm install --omit=dev (axios)…');
	execSync('npm install --omit=dev --no-package-lock --no-fund --no-audit', {
		cwd: staging,
		stdio: 'inherit',
	});

	mkdirSync(path.dirname(releaseRoot), { recursive: true });

	const prev = `${releaseRoot}.prev`;
	const next = `${releaseRoot}.next`;
	rmSync(next, { recursive: true, force: true });
	rmSync(prev, { recursive: true, force: true });

	cpSync(staging, next, { recursive: true });

	if (existsSync(releaseRoot)) {
		renameSync(releaseRoot, prev);
	}
	renameSync(next, releaseRoot);
	rmSync(prev, { recursive: true, force: true });

	log(`Release ready: ${releaseRoot}`);
	log('Prod: set N8N_CUSTOM_EXTENSIONS to this path, then restart n8n.');
	log('Dev: keep editing custom/n8n-nodes-rm-workflow — it will NOT touch this folder.');
} finally {
	rmSync(staging, { recursive: true, force: true });
}
