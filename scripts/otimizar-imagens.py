# -*- coding: utf-8 -*-
"""
otimizar-imagens.py - converte para WebP e reduz as imagens que o site serve
maiores do que precisa.

Roda sob demanda, quando entram fotos novas em assets/img/ - nao faz parte do
fluxo de publicacao. Precisa do Pillow:

    pip install pillow
    python scripts/otimizar-imagens.py           # mostra o que faria
    python scripts/otimizar-imagens.py --aplicar # grava os arquivos

O que ele faz:

  1. Logo do cabecalho: o arquivo original tem 834x469 e aparece na tela com
     92x52. Gera uma versao WebP lossless no dobro do tamanho de exibicao (suficiente
     para telas retina) e deixa o PNG original no lugar, porque o JSON-LD e as
     imagens de compartilhamento apontam para ele.

  2. Fotos em PNG/JPEG dentro de assets/img/real/: viram WebP com qualidade 82,
     que e visualmente igual e costuma custar metade dos bytes. So substitui se
     o WebP realmente ficar menor.

Depois de aplicar, rode:

    node scripts/imagens.js     # atualiza width/height das tags <img>
"""
import io
import os
import re
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow nao instalado. Rode: pip install pillow')

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APLICAR = '--aplicar' in sys.argv

# Maior altura em que o logo aparece (rodape = 56px), dobrada para telas retina.
LOGO_ORIGEM = 'assets/img/logo-cafeworking.png'
LOGO_DESTINO = 'assets/img/logo-cafeworking.webp'
LOGO_ALTURA = 146

QUALIDADE = 82
PASTA_FOTOS = 'assets/img/real'


def kb(n):
    return '%dKB' % (n // 1024)


def gerar_logo():
    origem = os.path.join(RAIZ, LOGO_ORIGEM)
    destino = os.path.join(RAIZ, LOGO_DESTINO)
    im = Image.open(origem)
    escala = LOGO_ALTURA / float(im.height)
    novo = (int(round(im.width * escala)), LOGO_ALTURA)
    reduzido = im.resize(novo, Image.LANCZOS)

    buf = io.BytesIO()
    # lossless: o logo tem tipografia fina e e a identidade da marca - com
    # perda, 10% dos pixels destoavam do original em tela 1x.
    reduzido.save(buf, 'WEBP', lossless=True, method=6)
    dados = buf.getvalue()

    antes = os.path.getsize(origem)
    print('logo: %s %s -> %s %s (%s por pagina)' % (
        im.size, kb(antes), novo, kb(len(dados)), kb(antes - len(dados))))

    if APLICAR:
        with open(destino, 'wb') as f:
            f.write(dados)
    return LOGO_DESTINO, novo


def trocar_logo_no_html(destino, tamanho):
    """Troca o src das tags <img> do logo. O PNG continua no repositorio para o
    JSON-LD e as imagens de compartilhamento."""
    paginas = [f for f in sorted(os.listdir(RAIZ)) if f.endswith('.html')]
    alteradas = 0
    for pagina in paginas:
        caminho = os.path.join(RAIZ, pagina)
        with io.open(caminho, encoding='utf-8') as f:
            antes = f.read()
        # so dentro de tag <img>; nao mexe em JSON-LD nem em meta og:image
        def troca(m):
            return m.group(0).replace('logo-cafeworking.png', 'logo-cafeworking.webp')
        depois = re.sub(r'<img\b[^>]*logo-cafeworking\.png[^>]*>', troca, antes)
        # as dimensoes antigas ficaram erradas; o imagens.js recalcula depois
        depois = re.sub(
            r'(<img\b[^>]*logo-cafeworking\.webp[^>]*?)\swidth="\d+"\sheight="\d+"',
            r'\1', depois)
        if depois != antes:
            alteradas += 1
            if APLICAR:
                with io.open(caminho, 'w', encoding='utf-8', newline='') as f:
                    f.write(depois)
    print('logo trocado em %d paginas (%s)' % (alteradas, 'gravado' if APLICAR else 'simulado'))


def converter_fotos():
    base = os.path.join(RAIZ, PASTA_FOTOS)
    economia = 0
    convertidas = []
    for pasta, _, arquivos in os.walk(base):
        for nome in sorted(arquivos):
            if not nome.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
            origem = os.path.join(pasta, nome)
            im = Image.open(origem)
            if im.mode not in ('RGB', 'L'):
                im = im.convert('RGB')

            buf = io.BytesIO()
            im.save(buf, 'WEBP', quality=QUALIDADE, method=6)
            dados = buf.getvalue()

            antes = os.path.getsize(origem)
            if len(dados) >= antes:
                continue

            destino = os.path.splitext(origem)[0] + '.webp'
            rel_antes = os.path.relpath(origem, RAIZ).replace('\\', '/')
            rel_depois = os.path.relpath(destino, RAIZ).replace('\\', '/')
            print('  %s %s -> %s %s' % (rel_antes, kb(antes), os.path.basename(destino), kb(len(dados))))
            economia += antes - len(dados)
            convertidas.append((rel_antes, rel_depois))

            if APLICAR:
                with open(destino, 'wb') as f:
                    f.write(dados)
    print('fotos: %d convertidas, %s economizados' % (len(convertidas), kb(economia)))
    return convertidas


def trocar_fotos_no_html(convertidas):
    if not convertidas:
        return
    paginas = [f for f in sorted(os.listdir(RAIZ)) if f.endswith('.html')]
    total = 0
    usados = set()
    for pagina in paginas:
        caminho = os.path.join(RAIZ, pagina)
        with io.open(caminho, encoding='utf-8') as f:
            antes = f.read()
        depois = antes
        for velho, novo in convertidas:
            if velho in depois:
                depois = depois.replace(velho, novo)
                usados.add(velho)
        # dimensoes ficam obsoletas em qualquer tag alterada; imagens.js refaz
        if depois != antes:
            total += 1
            if APLICAR:
                with io.open(caminho, 'w', encoding='utf-8', newline='') as f:
                    f.write(depois)
    print('fotos trocadas em %d paginas; %d arquivos referenciados' % (total, len(usados)))
    orfaos = [v for v, _ in convertidas if v not in usados]
    if orfaos:
        print('nao referenciados no HTML (pode apagar a mao):', ', '.join(orfaos))


print('=== logo ===')
destino, tamanho = gerar_logo()
trocar_logo_no_html(destino, tamanho)
print('=== fotos em %s ===' % PASTA_FOTOS)
trocar_fotos_no_html(converter_fotos())
if not APLICAR:
    print('\nsimulacao. Rode com --aplicar para gravar.')
else:
    print('\nagora rode: node scripts/imagens.js')
