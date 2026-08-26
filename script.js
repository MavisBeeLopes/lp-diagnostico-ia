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
      lgpd: form.elements["lgpd"].checked
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
