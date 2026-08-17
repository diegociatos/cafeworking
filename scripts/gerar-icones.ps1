# Gera os favicons e icones do PWA a partir do simbolo do logo CafeWorking.
# Uso: powershell -File scripts/gerar-icones.ps1
# O Google mostra o favicon nos resultados de busca no celular - ter um icone
# proprio (em vez de globo cinza) melhora o reconhecimento e o clique.

Add-Type -AssemblyName System.Drawing

$raiz = Split-Path $PSScriptRoot -Parent
$destino = Join-Path $raiz 'assets\img\icons'
if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

$logo = [System.Drawing.Image]::FromFile((Join-Path $raiz 'assets\img\logo-cafeworking.png'))

# recorte do simbolo (wifi + xicara) no topo do logo, antes da tipografia
$rec = New-Object System.Drawing.Rectangle(325, 5, 235, 262)
$fundo = [System.Drawing.Color]::White

function Gerar([int]$tam, [string]$arquivo, [bool]$comFundo) {
  $bmp = New-Object System.Drawing.Bitmap($tam, $tam)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.SmoothingMode = 'HighQuality'
  if ($comFundo) { $g.Clear($fundo) } else { $g.Clear([System.Drawing.Color]::Transparent) }
  $m = [int]($tam * 0.08)
  $util = $tam - 2 * $m
  # preserva a proporcao do simbolo dentro do quadrado
  $escala = [math]::Min($util / $rec.Width, $util / $rec.Height)
  $dw = [int]($rec.Width * $escala)
  $dh = [int]($rec.Height * $escala)
  $destRect = New-Object System.Drawing.Rectangle([int](($tam - $dw) / 2), [int](($tam - $dh) / 2), $dw, $dh)
  $g.DrawImage($logo, $destRect, $rec, 'Pixel')
  $g.Dispose()
  $caminho = Join-Path $destino $arquivo
  $bmp.Save($caminho, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host ("ok  {0,-24} {1}x{1}" -f $arquivo, $tam)
}

Gerar 32  'favicon-32.png'       $true
Gerar 48  'favicon-48.png'       $true
Gerar 180 'apple-touch-icon.png' $true
Gerar 192 'icon-192.png'         $true
Gerar 512 'icon-512.png'         $true

$logo.Dispose()
Write-Host "`nIcones gerados em assets/img/icons/"
