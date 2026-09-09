/* =========================================================
   Lughy — LP Campanha "Diagnóstico de Código gerado por IA"
   JS essencial: acordeão FAQ, validação do form, smooth scroll
   ========================================================= */
(function () {
  "use strict";

  /* -------- 1. FAQ: comportamento de acordeão --------
     Os <details> já são acessíveis por natureza. Aqui só garantimos
     que abrir um item feche os demais (um aberto por vez). */
  var faqItems = document.querySelectorAll(".faq__item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* -------- 2. Smooth scroll dos CTAs até o formulário --------
     Fallback via JS (o CSS já cobre com scroll-behavior). */
  var header = document.querySelector(".site-header");
  document.querySelectorAll(".js-scroll").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = link.getAttribute("href");
      if (!targetId || targetId.charAt(0) !== "#") return;
      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      var offset = (header ? header.offsetHeight : 0) + 16;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: "smooth" });

      // foco no primeiro campo para acessibilidade
      var firstField = target.querySelector("input, textarea, select");
      if (firstField) {
        window.setTimeout(function () {
          firstField.focus({ preventScroll: true });
        }, 500);
      }
    });
  });

  /* -------- 3. Validação básica do formulário -------- */
  var form = document.getElementById("formulario");
  if (!form) return;

  var successMsg = form.querySelector(".form-card__success");
  var errorMsg = form.querySelector(".form-card__error");
  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn ? submitBtn.textContent : "";
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  /* Base do documento. Hoje a LP roda na raiz de um domínio
     (diagnostico-ia.lughy.com.br/), então isto resolve para "/" — igual a um
     caminho absoluto. Fica derivado do diretório de propósito: se algum dia ela
     for servida sob um prefixo (/diagnostico-ia/), o POST continua caindo na
     função certa em vez de na raiz do domínio. */
  var BASE = (function () {
    var p = window.location.pathname || "/";
    // terminou em nome de arquivo (index.html) → sobe para o diretório
    if (/\.[a-z0-9]+$/i.test(p)) return p.replace(/[^/]*$/, "");
    // terminou em diretório, com ou sem barra
    return p.charAt(p.length - 1) === "/" ? p : p + "/";
  })();
  var ENDPOINT = BASE + "api/rd-conversao";
  var THANKYOU_URL = BASE + "obrigado.html?convertido=1";

  /* -------- Origem do lead --------
     A conversão é registrada pelo servidor, então o RD Station não enxerga
     cookie, referrer nem UTM do visitante: sem os dados abaixo, todo lead
     entra como "origem desconhecida". Coletamos aqui, no navegador, e
     mandamos junto no POST. */
  function lerCookie(nome) {
    var m = document.cookie.match("(?:^|; )" + nome.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)");
    if (!m) return "";
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  function coletarOrigem() {
    var params = new URLSearchParams(window.location.search);
    // _rdtrk guarda o id do visitante; ora vem cru, ora dentro de um JSON
    var rdtrk = lerCookie("_rdtrk");
    var uuid = rdtrk.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return {
      // cookie de origem do código de monitoramento do RD Station
      trf_src: lerCookie("__trf.src"),
      client_tracking_id: uuid ? uuid[0] : "",
      // rede de segurança: se o cookie não existir, usamos a UTM da própria URL
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      referrer: document.referrer || ""
    };
  }

  function showError(name, show) {
    var el = form.querySelector('[data-error-for="' + name + '"]');
    var field = form.elements[name];
    if (el) el.hidden = !show;
    if (field && field.setAttribute) {
      field.setAttribute("aria-invalid", show ? "true" : "false");
    }
  }

  function validate() {
    var ok = true;
    var firstInvalid = null;

    // Campos obrigatórios de texto e o select da ferramenta de IA
    ["nome", "projeto", "ferramenta"].forEach(function (name) {
      var value = form.elements[name].value.trim();
      var invalid = value === "";
      showError(name, invalid);
      if (invalid) { ok = false; firstInvalid = firstInvalid || form.elements[name]; }
    });

    // E-mail
    var email = form.elements["email"].value.trim();
    var emailInvalid = !emailRe.test(email);
    showError("email", emailInvalid);
    if (emailInvalid) { ok = false; firstInvalid = firstInvalid || form.elements["email"]; }

    // WhatsApp (mínimo de dígitos)
    var phoneDigits = form.elements["telefone"].value.replace(/\D/g, "");
    var phoneInvalid = phoneDigits.length < 10;
    showError("telefone", phoneInvalid);
    if (phoneInvalid) { ok = false; firstInvalid = firstInvalid || form.elements["telefone"]; }

    // Autorização de contato (LGPD)
    var lgpd = form.elements["lgpd"];
    var lgpdInvalid = !lgpd.checked;
    showError("lgpd", lgpdInvalid);
    if (lgpdInvalid) { ok = false; firstInvalid = firstInvalid || lgpd; }

    return { ok: ok, firstInvalid: firstInvalid };
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? "Enviando..." : submitLabel;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var result = validate();

    if (successMsg) successMsg.hidden = true;
    if (errorMsg) errorMsg.hidden = true;

    if (!result.ok) {
      if (result.firstInvalid) result.firstInvalid.focus();
      return;
    }

    // Monta os dados e envia para a função serverless, que registra no RD Station.
    // TODO (integração): confirmar com o time de marketing o conversion_identifier
    // desta campanha antes de publicar (ver api/rd-conversao.js).
    var data = {
      nome: form.elements["nome"].value.trim(),
      email: form.elements["email"].value.trim(),
      telefone: form.elements["telefone"].value.trim(),
      projeto: form.elements["projeto"].value.trim(),
      ferramenta: form.elements["ferramenta"].value.trim(),
      lgpd: form.elements["lgpd"].checked,
      origem: coletarOrigem()
    };

    setLoading(true);
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "Falha no envio");
        // Conversão registrada → redireciona para a thank you page
        form.reset();
        window.location.assign(THANKYOU_URL);
      })
      .catch(function () {
        if (errorMsg) {
          errorMsg.hidden = false;
          errorMsg.setAttribute("tabindex", "-1");
          errorMsg.focus && errorMsg.focus();
        }
        setLoading(false);
      });
  });

  // Limpa o erro do campo assim que o usuário corrige
  form.addEventListener("input", function (e) {
    var name = e.target.name;
    if (!name) return;
    var el = form.querySelector('[data-error-for="' + name + '"]');
    if (el && !el.hidden) showError(name, false);
  });
  form.addEventListener("change", function (e) {
    var name = e.target.name;
    if (!name) return;
    var el = form.querySelector('[data-error-for="' + name + '"]');
    if (el && !el.hidden) showError(name, false);
  });
})();

/* =========================================================
   Carrossel genérico
   Move tanto os depoimentos do NPS quanto os cases em vídeo. Cada raiz
   declara [data-carrossel] e o seletor dos seus itens em [data-item].
   Um item por vez; os inativos usam [hidden], que além de esconder também
   os tira do leitor de tela.
   ========================================================= */
(function () {
  "use strict";

  var semAnimacao = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function criarCarrossel(raiz) {
    var seletor = raiz.getAttribute("data-item");
    var itens = Array.prototype.slice.call(raiz.querySelectorAll(seletor));
    if (itens.length < 2) return null;

    var viewport = raiz.querySelector(".depo__viewport");
    var caixaPontos = raiz.querySelector("[data-carrossel-dots]");
    var btnPrev = raiz.querySelector(".depo__nav--prev");
    var btnNext = raiz.querySelector(".depo__nav--next");
    var atual = 0;
    var timer = null;
    var INTERVALO = 7000;
    var travado = false; // vídeo aberto: não troca de slide sozinho

    /* Altura que o card precisa ter para caber o maior item sem pular a cada
       troca. Soma o padding porque o min-height é border-box: medir só o
       conteúdo deixaria o slide mais alto estourando a altura travada.

       A guarda de largura não é decorativa: rodando com o elemento sem
       largura (aba oculta, ancestral display:none), o texto quebra em uma
       coluna de um caractere e devolveria uma altura absurda. */
    function alturaNecessaria() {
      if (!viewport.offsetWidth) return 0;
      viewport.style.minHeight = "";
      var cs = window.getComputedStyle(viewport);
      var padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

      var estado = itens.map(function (item) { return item.hidden; });
      var maior = 0;
      itens.forEach(function (_, alvo) {
        /* Exatamente UM item visível por medição. Deixar dois aparecendo
           muda a altura da página, o que pode fazer a barra de rolagem
           surgir, encolher a largura e rebobinar o texto.

           Medimos o CARD, não o item: somar o padding à altura do item
           erra por causa de colapso de margem entre eles. O card já é o
           que vai renderizar. */
        itens.forEach(function (item, k) { item.hidden = k !== alvo; });
        maior = Math.max(maior, viewport.getBoundingClientRect().height);
      });
      itens.forEach(function (item, k) { item.hidden = estado[k]; });

      // padding lido só para não devolver altura menor que um card vazio
      return maior ? Math.ceil(Math.max(maior, padding)) : 0;
    }

    function aplicarAltura(px) {
      if (px) viewport.style.minHeight = px + "px";
    }

    var pontos = itens.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "depo__dot";
      b.setAttribute("aria-label", "Ver item " + (i + 1) + " de " + itens.length);
      b.addEventListener("click", function () { mostrar(i); parar(); });
      caixaPontos.appendChild(b);
      return b;
    });

    function mostrar(i) {
      atual = (i + itens.length) % itens.length;
      itens.forEach(function (item, k) { item.hidden = k !== atual; });
      pontos.forEach(function (p, k) {
        if (k === atual) p.setAttribute("aria-current", "true");
        else p.removeAttribute("aria-current");
      });
    }

    function comecar() {
      if (semAnimacao || travado || timer) return;
      timer = window.setInterval(function () { mostrar(atual + 1); }, INTERVALO);
    }

    function parar() {
      if (timer) { window.clearInterval(timer); timer = null; }
    }

    btnPrev.addEventListener("click", function () { mostrar(atual - 1); parar(); });
    btnNext.addEventListener("click", function () { mostrar(atual + 1); parar(); });

    raiz.addEventListener("mouseenter", parar);
    raiz.addEventListener("mouseleave", comecar);
    raiz.addEventListener("focusin", parar);

    raiz.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { mostrar(atual - 1); parar(); }
      if (e.key === "ArrowRight") { mostrar(atual + 1); parar(); }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) parar(); else comecar();
    });

    mostrar(0);
    comecar();

    return {
      travar: function () { travado = true; parar(); },
      alturaNecessaria: alturaNecessaria,
      aplicarAltura: aplicarAltura,
      viewport: viewport
    };
  }

  var carrosseis = {};
  var todos = [];
  document.querySelectorAll("[data-carrossel]").forEach(function (raiz) {
    var api = criarCarrossel(raiz);
    if (!api) return;
    api.raiz = raiz;
    carrosseis[raiz.getAttribute("data-item")] = api;
    todos.push(api);
  });

  /* Carrossels que dividem a mesma linha precisam da MESMA altura, senão as
     bases dos cards e as fileiras de controle ficam em alturas diferentes e
     a seção parece quebrada. Empilhados (mobile), cada um usa a sua, para o
     mais curto não ganhar um vão vazio embaixo. */
  function equalizar() {
    var medidas = todos.map(function (api) { return api.alturaNecessaria(); });
    if (medidas.some(function (m) { return !m; })) return;

    var grupos = {};
    todos.forEach(function (api, i) {
      var linha = Math.round(api.viewport.getBoundingClientRect().top + window.pageYOffset);
      // tolerância de 4px para diferenças de arredondamento
      var chave = Object.keys(grupos).find(function (k) { return Math.abs(k - linha) <= 4; });
      if (chave === undefined) chave = linha;
      (grupos[chave] = grupos[chave] || []).push(i);
    });

    Object.keys(grupos).forEach(function (chave) {
      var idx = grupos[chave];
      var alvo = Math.max.apply(null, idx.map(function (i) { return medidas[i]; }));
      idx.forEach(function (i) { todos[i].aplicarAltura(alvo); });
    });
  }

  equalizar();

  var reflow;
  window.addEventListener("resize", function () {
    window.clearTimeout(reflow);
    reflow = window.setTimeout(equalizar, 150);
  });
  // as capas dos vídeos entram depois e mudam a altura da coluna
  window.addEventListener("load", equalizar);

  /* -------- Cases em vídeo: fachada --------
     Só a capa carrega junto com a página. O player do YouTube entra no DOM
     no clique. São três vídeos: embutir os três iframes de saída custaria
     alguns MB de terceiros e cookies antes de qualquer interesse do
     visitante. Usa youtube-nocookie e para o giro automático quando abre,
     para o vídeo não sumir no meio. */
  document.querySelectorAll(".case__quadro").forEach(function (quadro) {
    var botao = quadro.querySelector(".case__play");
    if (!botao) return;

    botao.addEventListener("click", function () {
      var id = quadro.getAttribute("data-video");
      if (!id) return;

      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) +
                   "?autoplay=1&rel=0&modestbranding=1";
      iframe.title = botao.getAttribute("aria-label") || "Vídeo de case da Lughy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.loading = "lazy";
      iframe.className = "case__iframe";

      quadro.innerHTML = "";
      quadro.appendChild(iframe);
      quadro.classList.add("is-tocando");

      var api = carrosseis[".case"];
      if (api) api.travar();
    });
  });
})();
