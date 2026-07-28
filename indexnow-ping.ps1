# Tell IndexNow that this site's pages exist or changed.
#
# Bing, Yandex, Seznam and Naver all read IndexNow. Google does not, so this
# script is the non-Google half of the indexing story: Search Console covers
# Google, this covers the engines that AI assistants and DuckDuckGo read.
#
# Run it after a production deploy that changed page content. Pinging on every
# deploy regardless is fine, IndexNow is designed for that, but pinging the same
# unchanged URLs many times a day is the one way to get throttled.
#
# The key file at the site root must stay reachable. If it 404s, every
# submission is rejected and this script has no effect.

$ErrorActionPreference = 'Stop'

$key  = '9b1d1450bcbfba3398019b7927616789'
$host_ = 'pranavkaja.com'
$sitemap = Join-Path $PSScriptRoot 'sitemap.xml'

if (-not (Test-Path $sitemap)) { throw "sitemap.xml not found next to this script" }

# Pull the URL list straight from the sitemap so the two never drift apart.
$urls = ([xml](Get-Content $sitemap -Raw)).urlset.url |
        ForEach-Object { $_.loc } |
        Where-Object { $_ }

if (-not $urls) { throw "no <loc> entries found in sitemap.xml" }

$body = @{
    host        = $host_
    key         = $key
    keyLocation = "https://$host_/$key.txt"
    urlList     = @($urls)
} | ConvertTo-Json -Depth 3

Write-Host "Submitting $($urls.Count) URLs to IndexNow..."

# 200 means accepted, 202 means accepted but the key is still being verified.
# 403 almost always means the key file is missing from the deployed root.
$resp = Invoke-WebRequest -Uri 'https://api.indexnow.org/indexnow' `
                          -Method Post `
                          -ContentType 'application/json; charset=utf-8' `
                          -Body $body `
                          -UseBasicParsing

Write-Host "IndexNow responded $($resp.StatusCode) $($resp.StatusDescription)"
