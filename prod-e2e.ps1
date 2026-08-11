$ErrorActionPreference = 'Stop'
$url = 'https://nhzvfcuhqkrvvfzjxulh.supabase.co'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oenZmY3VocWtydnZmemp4dWxoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY2NTM0MywiZXhwIjoyMDg0MjQxMzQzfQ.ayzpl__IZtIQU6qSe7Slr3q-DWt5sc4s4ldDp5fF3Vs'
$anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oenZmY3VocWtydnZmemp4dWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjUzNDMsImV4cCI6MjA4NDI0MTM0M30.pjw36UTANNB8ZYtJ8dAYTaCMQfR7ukvvJ5TAgz5CPPI'
$base = 'https://agent-audit-black.vercel.app'

Write-Host "== Checking site root =="
$rootCode = & curl.exe -s -o NUL -w "%{http_code}" --max-time 60 "$base/"
Write-Host "root status = $rootCode"
if ($rootCode -ne '200') { throw "FAIL: root not 200" }

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$email = "prod-test-$stamp@example.com"
Write-Host "== Creating user $email =="
$createBody = @{ email = $email; password = 'TestPass123!'; email_confirm = $true; user_metadata = @{ name = 'Prod Test'; plan = 'free' } } | ConvertTo-Json -Depth 5
$createRes = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/admin/users" -Headers @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey" } -ContentType 'application/json' -Body $createBody
$userId = $createRes.id
Write-Host "userId=$userId"
$tokRes = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/token?grant_type=password" -Headers @{ apikey = $anonKey } -ContentType 'application/json' -Body (@{ email = $email; password = 'TestPass123!' } | ConvertTo-Json)
$token = $tokRes.access_token

Write-Host "== Running audit via production API (may take a while on cold start) =="
$body = '{"url":"https://example.com/"}'
Set-Content -Path "$env:TEMP\prod-body.json" -Value $body -NoNewline -Encoding ascii
$out = & curl.exe -s -N --max-time 240 -X POST "$base/api/audit" -H "Authorization: Bearer $token" -H "Content-Type: application/json" --data-binary "@$env:TEMP\prod-body.json"
$full = $out | Out-String
if ($full -match '"stage":"error"') {
  $m = [regex]::Match($full, '"error":"([^"]+)"')
  throw "FAIL: audit error stage: $($m.Groups[1].Value)"
}
if ($full -notmatch '"stage":"done"') { throw "FAIL: audit did not finish with done. Raw: " + $full.Substring(0, [Math]::Min(500, $full.Length)) }
Write-Host "audit done. score: $(([regex]::Match($full, '"score":(\d+)')).Groups[1].Value)"
Write-Host "engine: $(([regex]::Match($full, '"engine":"([^"]+)"')).Groups[1].Value)"
Write-Host "has screenshot: $($full -match '"screenshot":"data:')"

$profiles = Invoke-RestMethod -Method Get -Uri "$url/rest/v1/profiles?id=eq.$userId&select=*" -Headers @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey" }
if ($profiles[0].audits_used_this_month -ne 1) { throw "FAIL: usage not incremented, got $($profiles[0].audits_used_this_month)" }
Write-Host "usage incremented to $($profiles[0].audits_used_this_month)"

Write-Host "== Cleanup =="
Invoke-RestMethod -Method Delete -Uri "$url/rest/v1/profiles?id=eq.$userId" -Headers @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey" } | Out-Null
Invoke-RestMethod -Method Delete -Uri "$url/auth/v1/admin/users/$userId" -Headers @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey" } | Out-Null
Write-Host "ALL PASS"
