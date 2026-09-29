$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot '.env.local'

Write-Host ''
Write-Host 'Aromacell DeepSeek API setup' -ForegroundColor Cyan
Write-Host 'The key will be written only to .env.local, which is excluded from Git.'
Write-Host ''

$secureKey = Read-Host 'Paste your DeepSeek API key' -AsSecureString
$credential = [System.Net.NetworkCredential]::new('', $secureKey)
$apiKey = $credential.Password.Trim()

if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw 'API key cannot be empty.'
}

$settings = [ordered]@{
  DEEPSEEK_API_KEY = $apiKey
  DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
  DEEPSEEK_MODEL = 'deepseek-chat'
  EXPLAIN_LLM = 'true'
  HARDWARE_API_URL = 'http://127.0.0.1:8765/v1/jobs'
  HARDWARE_API_TOKEN = ''
}

$existing = @()
if (Test-Path -LiteralPath $envPath) {
  $existing = @(Get-Content -LiteralPath $envPath)
}

foreach ($name in $settings.Keys) {
  $replacement = "$name=$($settings[$name])"
  $matched = $false
  $existing = @($existing | ForEach-Object {
    if ($_ -match "^$([regex]::Escape($name))=") {
      $matched = $true
      $replacement
    } else {
      $_
    }
  })
  if (-not $matched) {
    $existing += $replacement
  }
}

Set-Content -LiteralPath $envPath -Value $existing -Encoding utf8
$credential = $null
$secureKey = $null
$apiKey = $null

Write-Host ''
Write-Host 'Saved to .env.local.' -ForegroundColor Green
Write-Host 'Next: run "npm run check:api", then restart "npm run dev".'
