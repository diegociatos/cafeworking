# Gera as imagens Open Graph (1200x630 JPG) a partir das fotos reais do site.
# Uso: powershell -File scripts/gerar-og.ps1
# Requer Windows (usa WIC/System.Drawing). Rode de novo so quando trocar as fotos de origem.

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path $PSScriptRoot -Parent
$destino = Join-Path $raiz 'assets\img\og'
if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

$mapa = @(
  @{ out = 'og-default.jpg';           src = 'assets\img\real\fachada\fachada-noite.webp' }
  @{ out = 'og-luxemburgo.jpg';        src = 'assets\img\real\luxemburgo\recepcao.webp' }
  @{ out = 'og-estoril.jpg';           src = 'assets\img\real\estoril\estoril-01.webp' }
  @{ out = 'og-coworking.jpg';         src = 'assets\img\real\coworking\escritorio-compartilhado.webp' }
  @{ out = 'og-salas-privativas.jpg';  src = 'assets\img\real\salas-privativas\sala-ciatoslog.webp' }
  @{ out = 'og-salas-reuniao.jpg';     src = 'assets\img\real\salas-reuniao\sala-master.webp' }
  @{ out = 'og-atendimento.jpg';       src = 'assets\img\real\atendimento\sala-atendimento-privativo.webp' }
  @{ out = 'og-cafeteria.jpg';         src = 'assets\img\real\cafeteria\cafeteria-collage.webp' }
  @{ out = 'og-auditorio.jpg';         src = 'assets\img\real\auditorio\formato-u.webp' }
  @{ out = 'og-jardim.jpg';            src = 'assets\img\real\luxemburgo\jardim-mesa-1.webp' }
  @{ out = 'og-endereco-fiscal.jpg';   src = 'assets\img\endereco-fiscal.jpg' }
  @{ out = 'og-abertura-empresa.jpg';  src = 'assets\img\abertura-empresa.jpg' }
  @{ out = 'og-contabilidade.jpg';     src = 'assets\img\contabilidade.jpg' }
  @{ out = 'og-juridico.jpg';          src = 'assets\img\juridico.jpg' }
  @{ out = 'og-networking.jpg';        src = 'assets\img\networking.jpg' }
)

$L = 1200
$A = 630

function Carregar-Bitmap([string]$caminho) {
  $uri = [uri]("file:///" + $caminho.Replace('\', '/'))
  $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($uri, 'None', 'OnLoad')
  $frame = $decoder.Frames[0]
  $conv = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap($frame, [System.Windows.Media.PixelFormats]::Bgra32, $null, 0)
  $largura = $conv.PixelWidth
  $altura = $conv.PixelHeight
  $stride = $largura * 4
  $buffer = New-Object byte[] ($stride * $altura)
  $conv.CopyPixels($buffer, $stride, 0)
  $bmp = New-Object System.Drawing.Bitmap($largura, $altura, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $dados = $bmp.LockBits((New-Object System.Drawing.Rectangle(0, 0, $largura, $altura)), 'WriteOnly', [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  [System.Runtime.InteropServices.Marshal]::Copy($buffer, 0, $dados.Scan0, $buffer.Length)
  $bmp.UnlockBits($dados)
  return $bmp
}

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 82L)

foreach ($item in $mapa) {
  $origem = Join-Path $raiz $item.src
  if (-not (Test-Path $origem)) { Write-Host "faltando: $($item.src)" -ForegroundColor Yellow; continue }

  $src = Carregar-Bitmap $origem

  # recorte central na proporcao 1200x630
  $alvo = $L / $A
  $atual = $src.Width / $src.Height
  if ($atual -gt $alvo) {
    $cw = [int]($src.Height * $alvo); $ch = $src.Height
  } else {
    $cw = $src.Width; $ch = [int]($src.Width / $alvo)
  }
  $cx = [int](($src.Width - $cw) / 2)
  $cy = [int](($src.Height - $ch) / 2)

  $saida = New-Object System.Drawing.Bitmap($L, $A)
  $g = [System.Drawing.Graphics]::FromImage($saida)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.SmoothingMode = 'HighQuality'
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $L, $A)), (New-Object System.Drawing.Rectangle($cx, $cy, $cw, $ch)), 'Pixel')
  $g.Dispose()

  $caminhoSaida = Join-Path $destino $item.out
  $saida.Save($caminhoSaida, $codec, $params)
  $saida.Dispose()
  $src.Dispose()

  $kb = [math]::Round((Get-Item $caminhoSaida).Length / 1KB)
  Write-Host ("ok  {0,-28} {1} KB" -f $item.out, $kb)
}

Write-Host "`nImagens OG geradas em assets/img/og/"
