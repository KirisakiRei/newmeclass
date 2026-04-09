param(
  [Parameter(Mandatory = $true)]
  [string]$ImageTag,

  [Parameter(Mandatory = $true)]
  [string]$MidtransPublicClientKey,

  [string]$DockerHubUser = "favcreamyy",
  [string]$Platform = "linux/amd64",
  [string]$PublicDomain = "https://newmeclass.com",
  [string]$AppDomain = "https://app.newmeclass.com"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Docker Hub user : $DockerHubUser"
Write-Host "==> Image tag       : $ImageTag"
Write-Host "==> Platform        : $Platform"

$builderName = "newmebuilder"
$builderExists = docker buildx ls | Select-String -Pattern "^\s*$builderName\s"

if (-not $builderExists) {
  Write-Host "==> Membuat buildx builder: $builderName"
  docker buildx create --name $builderName --use | Out-Null
} else {
  Write-Host "==> Menggunakan buildx builder: $builderName"
  docker buildx use $builderName
}

docker buildx inspect --bootstrap | Out-Null

Write-Host "==> Login Docker Hub jika belum login"
docker login

Write-Host "==> Build + push backend runtime"
docker buildx build `
  --platform $Platform `
  -t "${DockerHubUser}/newme-backend:${ImageTag}" `
  --target runtime `
  ./backend `
  --push

Write-Host "==> Build + push backend tools"
docker buildx build `
  --platform $Platform `
  -t "${DockerHubUser}/newme-backend-tools:${ImageTag}" `
  --target build `
  ./backend `
  --push

Write-Host "==> Build + push public frontend"
docker buildx build `
  --platform $Platform `
  -t "${DockerHubUser}/newme-landing-cms-frontend:${ImageTag}" `
  --build-arg VITE_BACKEND_URL= `
  --build-arg VITE_DASHBOARD_URL=$AppDomain `
  ./landingpage-cms-frontend `
  --push

Write-Host "==> Build + push dashboard frontend"
docker buildx build `
  --platform $Platform `
  -t "${DockerHubUser}/newme-app-frontend:${ImageTag}" `
  --build-arg REACT_APP_BACKEND_URL= `
  --build-arg REACT_APP_PUBLIC_WEB_URL=$PublicDomain `
  --build-arg REACT_APP_DASHBOARD_URL=$AppDomain `
  --build-arg REACT_APP_FRONTEND_URL=$AppDomain `
  --build-arg REACT_APP_SITE_URL=$AppDomain `
  --build-arg MIDTRANS_PUBLIC_CLIENT_KEY=$MidtransPublicClientKey `
  --build-arg REACT_APP_MIDTRANS_IS_PRODUCTION=true `
  ./frontend `
  --push

Write-Host ""
Write-Host "Selesai push image ke Docker Hub."
Write-Host "Tag yang dipakai: $ImageTag"
Write-Host ""
Write-Host "Langkah berikutnya:"
Write-Host "1. Set APP_IMAGE_TAG=$ImageTag di file env production VPS"
Write-Host "2. Jalankan script deploy di VPS"
