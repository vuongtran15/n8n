/**
 * PM2 entry — đảm bảo process.argv[1] trỏ vào packages/cli/bin/n8n
 * (module-registry fallback dùng argv[1] khi require.resolve('n8n') fail dưới PM2).
 *
 * Usage: node scripts/pm2-n8n.cjs [worker|webhook|…]
 */
const path = require('path');
const { execFileSync } = require('child_process');

/** Ẩn cửa sổ console đen của chính process này trên Windows. */
function hideWindowsConsole() {
	if (process.platform !== 'win32') return;
	try {
		const pid = process.pid;
		const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public class N8nHideConsole {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public static void Hide(int pid) {
    try {
      var p = Process.GetProcessById(pid);
      if (p.MainWindowHandle != IntPtr.Zero) ShowWindow(p.MainWindowHandle, 0);
    } catch {}
  }
}
"@
[N8nHideConsole]::Hide(${pid})
`;
		execFileSync(
			'powershell.exe',
			['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps],
			{ windowsHide: true, stdio: 'ignore', timeout: 5000 },
		);
	} catch {
		// ignore — vẫn chạy được nếu ẩn cửa sổ fail
	}
}

hideWindowsConsole();
// Thử lại sau khi Node gắn console handle
setTimeout(hideWindowsConsole, 800);
setTimeout(hideWindowsConsole, 2500);

const binDir = path.join(__dirname, '..', 'packages', 'cli', 'bin');
const n8nEntry = path.join(binDir, 'n8n');

process.chdir(binDir);
process.argv[1] = n8nEntry;

require(n8nEntry);
