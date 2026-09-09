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
   Depoimentos: carrossel
   Um por vez. Avança sozinho, mas para assim que o visitante interage
   (mouse, foco ou teclado) para não trocar no meio de uma leitura.
   Slides inativos usam [hidden]: além de esconder, saem do leitor de tela.
   ========================================================= */
(function () {
  "use strict";

  var raiz = document.querySelector("[data-depo]");
  if (!raiz) return;

  var itens = Array.prototype.slice.call(raiz.querySelectorAll(".depo__item"));
  if (itens.length < 2) return;

  var viewport = raiz.querySelector(".depo__viewport");
  var caixaPontos = raiz.querySelector("[data-depo-dots]");
  var btnPrev = raiz.querySelector(".depo__nav--prev");
  var btnNext = raiz.querySelector(".depo__nav--next");
  var atual = 0;
  var timer = null;
  var INTERVALO = 7000;

  var semAnimacao = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* Trava a altura na do maior depoimento. Sem isto a seção "pula" a cada
     troca, porque as citações têm tamanhos bem diferentes entre si.

     A guarda de largura não é decorativa: se isto rodar enquanto o elemento
     está sem largura (aba oculta, ancestral display:none, painel recolhido),
     o texto quebra em uma coluna de um caractere e a altura medida vira um
     valor absurdo — que ficaria gravado no style inline. */
  function fixarAltura() {
    if (!viewport.offsetWidth) return;
    var maior = 0;
    itens.forEach(function (item) {
      var estavaOculto = item.hidden;
      item.hidden = false;
      maior = Math.max(maior, item.offsetHeight);
      item.hidden = estavaOculto;
    });
    if (maior) viewport.style.minHeight = maior + "px";
  }

  var pontos = itens.map(function (_, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "depo__dot";
    b.setAttribute("aria-label", "Ver depoimento " + (i + 1) + " de " + itens.length);
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
    if (semAnimacao || timer) return;
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

  // aba em segundo plano não precisa girar
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) parar(); else comecar();
  });

  mostrar(0);
  fixarAltura();
  window.addEventListener("resize", fixarAltura);
  comecar();
})();
