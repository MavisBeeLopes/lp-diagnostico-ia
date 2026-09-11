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

## Domínio: lp-diagnostico-ia-lughy.vercel.app

Fica na URL automática da Vercel, mesmo padrão das LPs irmãs (`lp-consultoria-suk`,
`lp-diagnostico-contabilidade`). Sem custo, sem DNS, deploy automático a cada push.

A Vercel acrescentou o sufixo `-lughy` porque `lp-diagnostico-ia.vercel.app` já
pertence a outra conta — subdomínios `.vercel.app` são únicos globalmente.

`og:url` e `rel=canonical` no `index.html` apontam para este endereço. **Se o domínio
mudar, os dois têm de mudar juntos** — senão o preview compartilhado canonicaliza para
uma URL que não serve a LP.

### Se um dia quiserem domínio próprio

O DNS de `lughy.com.br` é administrado no **Oracle Cloud DNS**
(`ns1..ns4.p201.dns.oraclecloud.net`), não no painel da hospedagem. O `A` do domínio
raiz aponta para `162.214.91.39`, o servidor do WordPress, e não mudaria.

O caminho mais simples seria um subdomínio: adicionar `diagnostico-ia.lughy.com.br`
em Project Settings → Domains, e criar no Oracle Cloud DNS um **CNAME** com nome
`diagnostico-ia` apontando para o alvo que a Vercel exibir. O Oracle salva alterações
de DNS como rascunho — é preciso clicar em **Publish changes**, senão o registro não
vale. Depois disso, atualizar `og:url` e `canonical`.

Opções avaliadas e descartadas para `lughy.com.br/diagnostico-ia`:

- **Proxy reverso** — exigiria `mod_proxy` no Apache, liberado só pelo provedor, e o
  proxy teria de cobrir toda a subárvore (incluindo `api/rd-conversao`).
- **Subir os arquivos numa pasta do WordPress** — funcionaria sem `mod_proxy` (o
  `.htaccess` do WP passa direto por arquivos e diretórios que existem), mas criaria
  uma segunda cópia da LP e exigiria CORS na função.

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

| # | título | mockup |
|---|---|---|
| 01 | Gerado por IA, nunca revisado | prompt → linhas de código → caixa de revisão vazia e tracejada |
| 02 | Segurança do código e dos dados | escudo com o código em cima e os cadastros de usuários embaixo; o perímetro não fecha e um cadastro aparece exposto |
| 03 | Bugs difíceis de rastrear | erro no topo e o rastro que some linha a linha até um "?" |
| 04 | Demo que não vira escala | medidor com ponteiro na faixa laranja + requisições estourando |

⚠️ **Divergência em relação à copy aprovada.** O `Copy_LP_Diagnostico_IA_Lughy.md` traz
quatro bullets, e o terceiro ("Está perto de escalar, captar investimento…") **foi
removido** a pedido. Em seu lugar entrou o bullet de segurança — do código e dos dados de
clientes e terceiros que fazem login e se cadastram na plataforma —, que **não consta
da copy aprovada**. Os quatro **títulos** também são novos — a copy
original não previa título por sinal. Tudo isso precisa passar por aprovação antes de
a campanha rodar. Os textos respeitam as regras de marca (sem prazo, sem preço, sem
DGS, IA nunca revisando sozinha).

O SVG do medidor (04) nasce baixo na viewBox — a semicircunferência deixa o vazio em
cima. Ele leva um `<g transform>` que sobe e amplia o conjunto para as margens baterem
com as dos outros três (~7% nas laterais). Se editar esse mockup, confira as margens.

O número de cada sinal fica **fora** do quadrado, acima do texto: dentro dele encobria
o conteúdo dos mockups. É ornamento (`aria-hidden`) e fica em branco esmaecido, não em
laranja — o laranja é do título, e dois elementos laranja empilhados competiam.

Contrastes em `.sinais`: texto 11,0:1, título laranja 7,1:1, número 5,1:1,
título da seção 15,7:1. O número estava em 42% de branco (3,98:1, reprovava) e subiu
para 50%.

## Pendências antes de publicar

- [x] `assets/og-image.jpg` (1200x630) — pronta. Para regerar, ver "Regerar a og-image" abaixo.
- [ ] Confirmar o `conversion_identifier` e as tags da campanha no RD Station.
- [ ] Trocar `cf_ferramenta_ia` pelo `api_identifier` real do campo customizado no RD Station
      (ver `api/rd-conversao.js`).
- [ ] Confirmar se o depoimento em vídeo da Wepsy pode ser reaproveitado nesta página
      (bloco previsto na copy, comentado no HTML).
- [ ] Confirmar o link real da Política de Privacidade no rodapé.

## Regerar a og-image

`og-image-source.html` é a arte de compartilhamento social em HTML, com caminhos
relativos — renderiza direto da raiz do projeto. Não há Node nesta máquina, então o
render é via Chrome headless:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --hide-scrollbars --virtual-time-budget=8000 --window-size=1200,630 --screenshot=og.png og-image-source.html
```

Depois converta `og.png` para `assets/og-image.jpg` (JPEG q86, 1200x630). O Chrome
escreve o PNG de forma assíncrona — se checar o arquivo imediatamente ele pode ainda
não existir. E o `<meta og:image>` aponta para `.jpg`: se mudar a extensão, atualize
as meta tags de Open Graph e Twitter no `index.html`.

## Regras de marca aplicadas

Nenhuma menção a prazo de entrega, a preço ou à DGS. **Nem a gratuidade**: a
palavra "gratuito" foi retirada de toda a LP (botão, rótulo acima do formulário e
meta description). A copy original a usava nos três pontos, seguindo o padrão das LPs
anteriores, e o próprio arquivo de copy deixava "confirmar se o diagnóstico será 100%
gratuito" como decisão em aberto. A decisão veio: não anunciar como gratuito.
O apelo agora é "sem compromisso de contratação", que continua na página. Toda menção a IA deixa
explícito que a revisão é feita por especialistas humanos — a IA nunca aparece
revisando ou decidindo sozinha.

## Depoimentos (seção 9)

Carrossel com as respostas do último NPS da Lughy, um depoimento por vez, com nome,
cargo e empresa. Sem biblioteca: `[hidden]` alterna os slides (esconde e tira do leitor
de tela), setas, pontos e as setas do teclado navegam, autoplay de 7s que **para** no
hover, no foco e com a aba em segundo plano.

`fixarAltura()` trava a altura na do maior depoimento, senão a seção pula a cada troca.
A guarda `if (!viewport.offsetWidth) return;` não é decorativa: se rodar com o elemento
sem largura (aba oculta, ancestral `display:none`), o texto quebra em uma coluna de um
caractere e grava uma altura absurda no style inline.

### Curadoria: 6 dos 10 depoimentos

A planilha tem 10 respostas. Quatro ficaram de fora:

| quem | por quê |
|---|---|
| Thales (RANKEN) | elogia e depois critica: "ficaram algumas lacunas", falta de documentação |
| Guilherme (Positiva Consultas) | cita "pontos de divergência em relação ao escopo" |
| Renato (Gregtur) | condicional: "quando finalizado certamente deve ser um case" |
| Diego Miguel (2ª resposta) | pessoa repetida; ficou a resposta mais forte |

**As citações são verbatim**, com duas exceções documentadas:

- **SYSTRA (Thalita)** — a resposta original tem ~700 caracteres e dominaria o
  carrossel. Usei um recorte contíguo, sem emendar trechos distantes.
- **Pedro Quintana** — normalizei pontuação e o acento de "parágrafo".

⚠️ **Consentimento não verificado.** Responder a uma pesquisa de NPS não é autorização
para publicar nome, cargo e empresa numa página de campanha. Confirmar com CS ou com o
comercial antes de subir mídia.

Os títulos da seção são copy nova, fora do `Copy_LP_Diagnostico_IA_Lughy.md`.
