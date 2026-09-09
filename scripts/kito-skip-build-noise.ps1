# An cac file generate bi "modified" sau pnpm build tren Windows (CRLF / regenerate),
# nhung GIU nguyen noi dung tren dia — khong restore, khong xoa.
#
# Chay trong root repo:
#   powershell -File scripts/kito-skip-build-noise.ps1
#   powershell -File scripts/kito-skip-build-noise.ps1 -Undo

param(
	[switch]$Undo
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$patterns = @(
	'\.generated\.yml$',
	'packages/@n8n/extension-sdk/schema\.json$'
)

$files = git ls-files | Where-Object {
	$f = $_
	$patterns | Where-Object { $f -match $_ }
}

if (-not $files) {
	Write-Output 'Khong tim thay file matching.'
	exit 0
}

$flag = if ($Undo) { '--no-skip-worktree' } else { '--skip-worktree' }
$action = if ($Undo) { 'unskip' } else { 'skip-worktree' }

foreach ($f in $files) {
	git update-index $flag -- $f
}

Write-Output ("{0}: {1} file(s)" -f $action, @($files).Count)
git status -sb
