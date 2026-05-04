# ============================================
# Script de Deploy - Verto -> Hostinger
# Basta executar: .\deploy-local.ps1
# ============================================

$FTP_SERVER = "46.202.145.236"
$FTP_USER   = "u969433331"
$FTP_PASS   = Read-Host "Digite a senha FTP da Hostinger"
$FTP_REMOTE = "/public_html"
$LOCAL_DIST = ".\dist"

# 1. Build
Write-Host "`n[1/3] Gerando build de producao..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no build! Verifique o codigo." -ForegroundColor Red
    exit 1
}
Write-Host "Build concluido!" -ForegroundColor Green

# 2. Upload via FTP
Write-Host "`n[2/3] Enviando arquivos para a Hostinger..." -ForegroundColor Cyan

function Upload-FTP {
    param($localPath, $remotePath)

    $items = Get-ChildItem -Path $localPath -Recurse

    foreach ($item in $items) {
        $relative = $item.FullName.Substring((Resolve-Path $localPath).Path.Length).Replace("\", "/")
        $remoteUrl = "ftp://${FTP_SERVER}${FTP_REMOTE}${relative}"

        if ($item.PSIsContainer) {
            # Cria diretório remoto
            try {
                $req = [System.Net.FtpWebRequest]::Create($remoteUrl)
                $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
                $req.Credentials = New-Object System.Net.NetworkCredential($FTP_USER, $FTP_PASS)
                $req.UsePassive = $true
                $req.UseBinary = $true
                $req.KeepAlive = $false
                $req.GetResponse() | Out-Null
            } catch {}
        } else {
            # Upload do arquivo
            try {
                $req = [System.Net.FtpWebRequest]::Create($remoteUrl)
                $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
                $req.Credentials = New-Object System.Net.NetworkCredential($FTP_USER, $FTP_PASS)
                $req.UsePassive = $true
                $req.UseBinary = $true
                $req.KeepAlive = $false

                $fileContent = [System.IO.File]::ReadAllBytes($item.FullName)
                $req.ContentLength = $fileContent.Length
                $stream = $req.GetRequestStream()
                $stream.Write($fileContent, 0, $fileContent.Length)
                $stream.Close()

                Write-Host "  Enviado: $relative" -ForegroundColor Gray
            } catch {
                Write-Host "  ERRO em $relative : $_" -ForegroundColor Yellow
            }
        }
    }
}

Upload-FTP -localPath $LOCAL_DIST -remotePath $FTP_REMOTE

# 3. Concluido
Write-Host "`n[3/3] Deploy concluido com sucesso!" -ForegroundColor Green
Write-Host "Acesse: https://sistema.vertolicitacoes.com.br" -ForegroundColor Cyan
