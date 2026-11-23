# Recortes de fundo das expressões (fotografias; não assets ASCII)

Ferramenta local reutilizável, instalada fora do repositório em
`~/.local/share/portrait-background-removal/`. Documentação operacional e
versões fixadas em
`~/.local/share/portrait-background-removal/README.md` e
`requirements.lock.txt`. Atalho executável em `~/.local/bin/portrait-bg`.
Ambiente isolado com `uv`, Python 3.12, rembg, ONNX Runtime GPU, PyTorch
e implementação oficial do BiRefNet HR Matting. A instalação não alterou
o Python global nem o driver NVIDIA. Em cada uso, o script escolhe CPU ou
CUDA **explicitamente** e salva um relatório do backend real.

Somente os JPEGs originais de `~/Pictures/fotosperfil/Câmera/selecionadas/`
são fontes: `_DSC2347.JPG` (angry), `_DSC2350.JPG` (thinking),
`_DSC2352.JPG` (disgust). `ImageOps.exif_transpose` converte a orientação 6
para retrato **3264 × 4928**. Nenhuma das fotos GIMP, originais ou assets
ASCII é escrita. O diretório de saída fica em
`editadas/background-tests/<modelo>/<expressão>/`; sua máscara crua
`original-model-mask.png`, os PNGs RGBA e os previews sobre preto, branco
e `#1c1c1e` ficam separados.

As referências GIMP `editadas/_DSC2311.png` e `editadas/_DSC2341.png`
não estavam presentes neste ambiente na data da avaliação; não substituímos
essas referências por PNGs automáticos.

```bash
portrait-bg thinking --model birefnet-portrait --backend cpu --edge both
portrait-bg thinking --model birefnet-general --backend cpu --edge both
portrait-bg hr thinking --backend cpu --edge both
```

`--edge raw` mantém o RGB original e aplica somente o alpha do modelo.
`--edge dc` salva também `decontaminated-rgba.png`: a estimativa de cor
descontamina pixels semitransparentes **sem alterar a máscara de alpha**.
Não aplicar limiares de luminosidade, erosão global ou correções horizontais
para limpar a testa. As imagens ampliadas do cabelo/testa servem para
avaliação, não para reconstruir o rosto.

Na RTX 4060 (8 GB), os processos gráficos existentes ocupavam ~3 GB;
BiRefNet Portrait (ONNX, CUDA) e HR Matting (2048², FP16, CUDA) atingiram
OOM. Não encerramos processos alheios nem reduzimos silenciosamente a
resolução do modelo; ambos foram executados explicitamente em CPU para os
testes. O checkpoint HR é FP16; na CPU, a inferência usa FP32 para evitar
os kernels FP16 muito lentos. O HR recebe a fotografia redimensionada a
2048 × 2048 conforme seu preprocessamento; a máscara volta a 3264 × 4928
e os pixels RGB finais vêm exclusivamente do JPEG EXIF-upright.
`torch.cuda.is_available()` foi verdadeiro; o modelo ONNX criou uma sessão
`CUDAExecutionProvider`, mas a execução CUDA falhou por falta de VRAM,
portanto **não** declaramos sucesso de inferência GPU.

**A qualidade das três novas fotografias depende de avaliação visual antes
de gerar mapas ASCII.** O busto neutro e a animação aprovados permanecem
intactos. Nenhum mapa foi gerado nesta etapa.

## Validação inicial: `_DSC2350.JPG`

- `birefnet-portrait`: no zoom, testa e pele entre cachos preservadas;
  contorno do cabelo relativamente natural, inclusive sobre branco.
- `birefnet-general`: conserva a testa, mas deixa linha cinza mais visível
  ao redor do cabelo e dos ombros.
- `isnet-general-use`: conserva a testa, porém a transição do cabelo parece
  mais difusa/acinzentada no fundo escuro.
- As máscaras originais e alternativas com descontaminação cromática estão
  salvas por modelo. A descontaminação mantém o mesmo canal alpha; a
  diferença de RGB na região central do rosto foi de **no máximo 1/255**
  entre `raw` e `dc` nos testes Portrait e General.
- Na máscara Portrait, as regiões centrais medidas da testa e do rosto
  permaneceram com alpha ≥ **254/255**; a amostra do canto do fundo teve
  alpha médio **0**. Esses testes numéricos **não substituem a inspeção
  visual dos fios**.
- Previews lado a lado em
  `editadas/background-tests/comparisons/thinking-{full,hair-forehead}-comparison.jpg`.
  As pastas de cada modelo também possuem zooms **sem redução** da
  região crítica sobre preto, branco e cinza-escuro.

O HR Matting em `_DSC2350.JPG` também preservou a testa e os cachos;
no fundo branco a diferença em relação ao Portrait é discreta.

## Candidatos recomendados

Pasta base:
`~/Pictures/fotosperfil/Câmera/selecionadas/editadas/background-tests/`.
Para revisão, os **três candidatos recomendados** são:

| JPEG original | Expressão | PNG RGBA recomendado (relativo à pasta base) |
| --- | --- | --- |
| `_DSC2347.JPG` | angry | `birefnet-portrait/angry/decontaminated-rgba.png` |
| `_DSC2350.JPG` | thinking | `birefnet-portrait/thinking/decontaminated-rgba.png` |
| `_DSC2352.JPG` | disgust | `birefnet-portrait/disgust/decontaminated-rgba.png` |

Escolha: no conjunto das três fotos, Portrait manteve testa, fios frontais
e cor do rosto e teve contorno natural no fundo cinza-escuro; HR Matting
também ficou bom e muito próximo, mas sem uma melhoria consistente que
justifique substituí-lo. General e IS-Net deixaram bordas mais acinzentadas
na foto de comparação (`thinking`). A preferência é visual, não um escore
objetivo. Os PNGs `original-mask-rgba.png` (sem descontaminação) e
`original-model-mask.png` (alpha antes da correção cromática) foram
preservados tanto em Portrait quanto em HR para todas as três fotos.
Os painéis de comparação de cada expressão estão em
`background-tests/comparisons/<expressão>-{full,hair-forehead}-comparison.jpg`;
as verificações numéricas em `<expressão>-alpha-validation.json`.

Todas as seis saídas Portrait/HR passaram na verificação automatizada de
3264 × 4928, RGB original no PNG raw, fundo transparente no canto e
alpha do PNG decontaminated idêntico ao da máscara salva. Nas três fotos,
a amostra central da testa ficou com alpha mínimo de 254/255 em ambos
os modelos; a inspeção visual dos previews sobre preto, branco e
cinza-escuro confirmou que a pele visível entre cachos permanece.
Pode haver fios muito finos ou halos discretos em fundo branco:
é uma limitação do recorte automático, não motivo para apagar a testa.
Os arquivos são **candidatos para revisão**, não uma substituição das
edições GIMP nem uma integração ao hero.
