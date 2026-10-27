import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const destDir = path.resolve(__dirname, '../src/nodes/RMWorkflow');
const png = path.resolve(destDir, 'iot-connect.png');

const b64 = fs.readFileSync(png).toString('base64');

// Tint black artwork to #e91e63
const pinkFilter =
	'brightness(0) saturate(100%) invert(27%) sepia(89%) saturate(7471%) hue-rotate(330deg) brightness(95%) contrast(92%)';

const imageAttrs =
	'x="3" y="11" width="30" height="30" preserveAspectRatio="xMidYMid meet"';
const rmText =
	'<text x="39" y="4.5" text-anchor="end" dominant-baseline="hanging" font-family="Inter, Arial, sans-serif" font-size="7" font-weight="700" fill="#e91e63">RM</text>';

const light = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
	<image ${imageAttrs} href="data:image/png;base64,${b64}" style="filter: ${pinkFilter};" />
	${rmText}
</svg>`;

const dark = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
	<image ${imageAttrs} href="data:image/png;base64,${b64}" style="filter: ${pinkFilter};" />
	${rmText}
</svg>`;

fs.writeFileSync(path.join(destDir, 'icon.svg'), light);
fs.writeFileSync(path.join(destDir, 'icon.dark.svg'), dark);
console.log('Wrote icons', light.length, dark.length, 'bytes');
