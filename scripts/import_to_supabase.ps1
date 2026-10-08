param(
    [Parameter(Mandatory=$true)]
    [string[]]$Archives
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "PROSOEL Costes - carga histórica a Supabase" -ForegroundColor Cyan
Write-Host "La conexión se usará solo en esta sesión y no se guardará en archivos." -ForegroundColor DarkGray
Write-Host ""

$secureUrl = Read-Host "Pega la Connection string (Session pooler) de Supabase" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)

try {
    $databaseUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)

    if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
        throw "No se recibió DATABASE_URL."
    }

    $env:DATABASE_URL = $databaseUrl

    if (-not (Test-Path ".venv")) {
        Write-Host "Creando entorno Python..." -ForegroundColor Yellow
        py -3.12 -m venv .venv
    }

    $python = Join-Path $PWD ".venv\Scripts\python.exe"

    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    & $python -m pip install --upgrade pip
    & $python -m pip install -e .

    Write-Host ""
    Write-Host "Importando pedidos..." -ForegroundColor Yellow
    & $python -m database.load_archives @Archives

    if ($LASTEXITCODE -ne 0) {
        throw "La importación terminó con error."
    }

    Write-Host ""
    Write-Host "Carga terminada." -ForegroundColor Green
}
finally {
    if ($ptr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
