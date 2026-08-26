# LP — Diagnóstico de Código/Plataforma gerada por IA (Lughy)

Landing page de campanha (Meta Ads + Google Search) para vibe coders / fundadores
técnicos que construíram um MVP com ferramentas de IA e querem saber se o código
está seguro, bem arquitetado e pronto para escalar.

Mesma stack e mesmo padrão de deploy das LPs irmãs `LP Diagnostico Contabilidade`
e `Landing Page Consultoria Suk`: HTML/CSS/JS estático, sem build.

## Rodar localmente

Não há dependências nem `npm install`. Qualquer servidor estático serve a raiz do
projeto. O jeito mais direto nesta máquina (não depende de Python nem de Node):

```bash
powershell -ExecutionPolicy Bypass -NoProfile -File ".claude/serve.ps1" -Port 8011
```

Depois abra `http://localhost:8011/`.

> A função serverless `api/rd-conversao.js` **não** roda nesse servidor estático.
> Localmente o formulário valida os campos normalmente, mas o envio final falha e
> exibe a mensagem de erro. Para testar o envio ponta a ponta, use `vercel dev`.

## Deploy na Vercel

1. Importar a pasta como projeto (framework preset: **Other** / sem build).
2. Configurar as variáveis de ambiente:
   - `RD_API_KEY` — API Key do RD Station Marketing (obrigatória).
   - `RD_CONVERSION_IDENTIFIER` — identificador da conversão. Padrão: `lp-diagnostico-ia`.
3. `vercel.json` já desativa cache de HTML/CSS/JS, para que ajustes de copy
   apareçam sem espera.

## Estrutura

```
index.html            página principal (todas as seções da copy aprovada)
obrigado.html         thank you page (destino após a conversão)
styles.css            design system da campanha (tokens herdados das LPs irmãs)
script.js             acordeão do FAQ, validação do form, smooth scroll
api/rd-conversao.js   função serverless que registra a conversão no RD Station
vercel.json           headers de cache
assets/
  logo-lughy-*.svg           logos oficiais (preto, branco, laranja)
  decor/db1group-signature.png   assinatura "Uma marca DB1 Group"
  decor/lughy-shape.svg          shape orgânico da marca
  decor/hero-diagnostico.jpg     hero — tela 01, exibida inteira e sangrando
  decor/cta-dev.jpg              fundo do CTA final — tela 08
  decor/esfera-lughy.png         esfera laranja decorativa — IMG.png
  clients/*.png                  10 logos de clientes ("Empresas que já confiam na Lughy")
```

### Imagens vindas do PPT comercial

As artes de `assets/decor/` saíram de
`Y:\Marketing\UNIDADES\LUGHY\2026\APRESENTAÇÃO COMERCIAL\TELAS\` (originais 1920x1080).
Foram redimensionadas e recomprimidas para a web — 5,2 MB de PNG viraram 333 KB de
JPEG. Redimensionamento feito com `System.Drawing` via PowerShell (esta máquina não
tem ImageMagick, ffmpeg nem Node): largura 1920 q78 para o hero, 1600 q76 para o CTA.

**Hero** — a arte é o **fundo da própria seção**, com a copy dentro da mesma
composição (`.hero__media` em `position:absolute`, `object-fit:cover`). A legibilidade
vem de um véu branco em `.hero::after`, e é ele que precisa de cuidado ao mexer:

- **Desktop (≥1025px)** — a arte começa em `left: 22%`, não em 0. Nesta tela a pessoa
  está no centro da composição; ancorando o quadro à direita ela sai de trás do texto.
  O véu é horizontal, opaco até 40% e dissolvido em 70%. A copy é limitada por
  `max-width` em `ch` (13ch no h1, 34ch no resto) e termina em 43% da largura.
- **Mobile/tablet** — véu vertical, quase opaco até 62%, e `min-height: 92svh` no hero
  para a arte aparecer abaixo da copy em vez de virar só textura atrás do texto.

Contraste medido compondo véu + pixel real da foto, ponto a ponto sobre a caixa de
cada elemento. Pior caso: **5,05:1 no desktop**, **5,05:1 no mobile**, **5,13:1 no
tablet** — sempre o eyebrow, que é o texto menor e em laranja. Se a copy do hero
crescer ou o véu for suavizado, remeça antes de publicar.

**CTA final** — a foto fica sob um véu (`linear-gradient` com alpha) calibrado para
manter o texto acima de 4,5:1 mesmo sobre o pixel mais claro da imagem (mede 13:1).
Se alguém mexer na opacidade do véu, vale reconferir o contraste antes de publicar.

A tela 04 (mesh gradient) chegou a ser testada na seção do DB1 e foi descartada —
essa seção usa fundo `--off-white` limpo. Uma versão da seção "Esses sinais..." com
fotos recortadas das telas também foi descartada (ver abaixo).

## Ritmo de seções claras e escuras

A página alterna deliberadamente. Blocos escuros nas posições **2** (`.sinais`),
**6** (`.frentes`) e **10** (`.cta-final`) — espaçados de forma regular. Ao mexer no
fundo de qualquer seção, confira se esse espaçamento se mantém: dois blocos escuros
seguidos achatam a hierarquia da página.

`.sinais` e `.frentes` compartilham o mesmo sistema visual (fundo escuro com brilho
laranja, ícones com `clip-path` hexagonal, cards translúcidos). A diferença proposital:
só `.frentes` tem o **hexágono central com o logo** — é a assinatura da seção de
serviços e não se repete em nenhum outro lugar.

### Os quatro mockups

Cada sinal tem um mockup **quadrado** (`aspect-ratio: 1/1`), em SVG inline — sem
imagem externa, sem requisição, escala sem perder nitidez. Quatro colunas no desktop,
duas no tablet, uma no mobile; o quadrado nunca vira retângulo.

| # | mockup | leitura |
|---|---|---|
| 01 | prompt → linhas de código → caixa de revisão vazia e tracejada | gerado, nunca revisado |
| 02 | erro no topo e o rastro que some linha a linha até um "?" | bug sem origem rastreável |
| 03 | barras subindo com seta de tendência sobre uma base rachada | escalar sobre fundação incerta |
| 04 | medidor com ponteiro na faixa laranja + requisições estourando | passa na demo, não na carga |

O SVG do medidor (04) nasce baixo na viewBox — a semicircunferência deixa o vazio em
cima. Ele leva um `<g transform>` que sobe e amplia o conjunto para as margens baterem
com as dos outros três (~7% nas laterais). Se editar esse mockup, confira as margens.

O número de cada sinal fica **fora** do quadrado, acima do texto: dentro dele encobria
o conteúdo dos mockups 01–03. É ornamento (`aria-hidden`).

Contrastes em `.sinais`: texto 11,0:1, número laranja 7,5:1, título 15,7:1,
laranja do destaque 5,0:1.

## Pendências antes de publicar

- [x] `assets/og-image.jpg` (1200x630) — gerada via Chrome headless a partir de `scratchpad/og.html`.
- [ ] Confirmar o `conversion_identifier` e as tags da campanha no RD Station.
- [ ] Trocar `cf_ferramenta_ia` pelo `api_identifier` real do campo customizado no RD Station
      (ver `api/rd-conversao.js`).
- [ ] Confirmar se o depoimento em vídeo da Wepsy pode ser reaproveitado nesta página
      (bloco previsto na copy, comentado no HTML).
- [ ] Confirmar o link real da Política de Privacidade no rodapé.

## Regras de marca aplicadas

Nenhuma menção a prazo de entrega, a preço ou à DGS. Toda menção a IA deixa
explícito que a revisão é feita por especialistas humanos — a IA nunca aparece
revisando ou decidindo sozinha.
