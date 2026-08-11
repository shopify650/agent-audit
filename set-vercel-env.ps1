$ErrorActionPreference = 'Stop'
$lines = Get-Content 'E:\ClarityOS\.env.local'
$vals = @{}
foreach ($l in $lines) {
  $t = $l.Trim()
  if ($t -eq '' -or $t.StartsWith('#')) { continue }
  $idx = $t.IndexOf('=')
  if ($idx -le 0) { continue }
  $name = $t.Substring(0, $idx).Trim()
  $value = $t.Substring($idx + 1).Trim()
  $vals[$name] = $value
}
$keys = @(
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FREE_AI_PROVIDER',
  'FREE_AI_KEY',
  'FREE_AI_MODEL',
  'FREE_AI_FALLBACKS',
  'FREE_AI_GEMINI_KEY',
  'FREE_AI_GROQ_KEY',
  'OPENAI_API_KEY',
  'CREEM_API_KEY',
  'CREEM_WEBHOOK_SECRET',
  'NEXT_PUBLIC_CREEM_PRO_URL',
  'NEXT_PUBLIC_CREEM_AGENCY_URL',
  'NEXT_PUBLIC_CREEM_STORE_ID'
)
foreach ($k in $keys) {
  if (-not $vals.ContainsKey($k)) { Write-Host "SKIP (missing in .env.local): $k"; continue }
  $tmp = "$env:TEMP\vercel-env-$k.txt"
  [System.IO.File]::WriteAllText($tmp, $vals[$k], [System.Text.Encoding]::ASCII)
  & cmd.exe /c "vercel env add $k production < `"$tmp`""
  Remove-Item $tmp -Force
}
Write-Host 'DONE'
