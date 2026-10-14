$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
node scripts/run.mjs install
if ($LASTEXITCODE -ne 0) { throw 'Backend installation failed' }
if (Get-Command npm -ErrorAction SilentlyContinue) {
  npm install
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
  pnpm install --store-dir .pnpm-store --config.node-linker=hoisted
} else {
  $novaPnpm = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd'
  if (-not (Test-Path -LiteralPath $novaPnpm)) { throw 'Install npm or pnpm and rerun setup.' }
  & $novaPnpm install --store-dir .pnpm-store --config.node-linker=hoisted
}
if ($LASTEXITCODE -ne 0) { throw 'Frontend installation failed' }
node scripts/run.mjs seed
