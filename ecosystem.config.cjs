/**
 * PM2 ecosystem — tương đương start-n8n-prod.bat (main + 2 workers).
 *
 * Dùng scripts/pm2-n8n.cjs (không gọi pm2 chạy .bat / os-normalize).
 * windowsHide + vizion:false giảm cửa sổ đen trên Windows.
 *
 * Start: start-n8n-pm2.bat
 * Stop:  stop-n8n-pm2.bat
 */
const path = require('path');

const root = __dirname;
const wrapper = path.join(root, 'scripts', 'pm2-n8n.cjs');

const common = {
	cwd: root,
	script: wrapper,
	interpreter: 'node',
	exec_mode: 'fork',
	instances: 1,
	autorestart: true,
	max_restarts: 20,
	min_uptime: '15s',
	kill_timeout: 15_000,
	watch: false,
	time: true,
	windowsHide: true,
	vizion: false,
	env: {
		GENERIC_TIMEZONE: 'Asia/Ho_Chi_Minh',
	},
};

module.exports = {
	apps: [
		{
			...common,
			name: 'n8n-main',
			args: '',
		},
		{
			...common,
			name: 'n8n-worker-1',
			args: 'worker',
			env: {
				...common.env,
				N8N_RUNNERS_BROKER_PORT: '5680',
			},
			restart_delay: 8_000,
		},
		{
			...common,
			name: 'n8n-worker-2',
			args: 'worker',
			env: {
				...common.env,
				N8N_RUNNERS_BROKER_PORT: '5681',
			},
			restart_delay: 10_000,
		},
	],
};
