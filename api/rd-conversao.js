// Função serverless (Vercel) — recebe o formulário da LP e registra a conversão
// no RD Station Marketing via API de Conversão (API Key).
//
// Variáveis de ambiente (configure no Vercel → Settings → Environment Variables):
//   RD_API_KEY                 (obrigatória) API Key do RD Station
//   RD_CONVERSION_IDENTIFIER   (opcional) identificador da conversão. Padrão: lp-diagnostico-ia
//
// TODO (antes de publicar): confirmar com o time de marketing o conversion_identifier
// e as tags desta campanha, para não misturar com as LPs de diagnóstico anteriores.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido" });
    return;
  }

  const apiKey = process.env.RD_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: "RD_API_KEY não configurada no servidor" });
    return;
  }

  const identifier = process.env.RD_CONVERSION_IDENTIFIER || "lp-diagnostico-ia";

  // corpo (Vercel já faz o parse de JSON em req.body)
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const email = str(body.email);
  if (!email) {
    res.status(400).json({ ok: false, error: "E-mail é obrigatório" });
    return;
  }

  const tags = ["diagnostico-ia", "vibe-coding"];

  const payload = {
    conversion_identifier: identifier,
    email: email,
    available_for_mailing: true,
    tags: tags,
  };
  const name = str(body.nome);          if (name) payload.name = name;
  const projeto = str(body.projeto);    if (projeto) payload.company_name = projeto;
  const phone = str(body.telefone);     if (phone) payload.mobile_phone = phone;

  // Ferramenta de IA usada no MVP — campo customizado do RD Station.
  // TODO: trocar "cf_ferramenta_ia" pelo api_identifier real do campo customizado
  // criado no RD Station; enquanto não existir, o dado também vai como tag.
  const ferramenta = str(body.ferramenta);
  if (ferramenta) {
    payload.cf_ferramenta_ia = ferramenta;
    payload.tags = tags.concat("ferramenta-" + ferramenta.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  }

  // Origem do lead. Sem estes campos o RD Station registra "origem desconhecida":
  // a chamada parte do servidor, então ele não tem cookie, referrer nem UTM.
  //
  // A documentação da API é explícita: se traffic_source levar o valor do cookie
  // __trf.src, os campos traffic_medium/campaign/value têm de ir VAZIOS. Por isso
  // os dois caminhos são exclusivos, e o cookie tem prioridade — ele carrega a
  // origem real da sessão, enquanto a UTM só descreve o clique atual.
  const origem = (body && typeof body.origem === "object" && body.origem) || {};
  const trfSrc = str(origem.trf_src);
  const utmSource = str(origem.utm_source);

  if (trfSrc) {
    payload.traffic_source = trfSrc;
  } else if (utmSource) {
    payload.traffic_source = utmSource;
    const medium = str(origem.utm_medium);      if (medium) payload.traffic_medium = medium;
    const campaign = str(origem.utm_campaign);  if (campaign) payload.traffic_campaign = campaign;
    const value = str(origem.utm_content);      if (value) payload.traffic_value = value;
  } else {
    // sem cookie e sem UTM: o referrer ainda diferencia orgânico de acesso direto
    const ref = str(origem.referrer);
    if (ref) {
      try { payload.traffic_source = new URL(ref).hostname; } catch (_) { /* referrer inválido, ignora */ }
    }
  }

  const trackingId = str(origem.client_tracking_id);
  if (trackingId) payload.client_tracking_id = trackingId;

  // Base legal (LGPD) quando o contato autorizou o contato
  if (body.lgpd) {
    payload.legal_bases = [
      { category: "communications", type: "consent", status: "granted" },
    ];
  }

  try {
    const rdRes = await fetch(
      "https://api.rd.services/platform/conversions?api_key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "CONVERSION", event_family: "CDP", payload: payload }),
      }
    );
    const text = await rdRes.text();
    if (!rdRes.ok) {
      console.error("RD Station erro", rdRes.status, text);
      res.status(502).json({
        ok: false,
        error: "Falha ao registrar a conversão no RD Station",
        status: rdRes.status,
        detail: text.slice(0, 600),
      });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro de conexão com o RD Station", err);
    res.status(500).json({ ok: false, error: "Erro de conexão com o RD Station" });
  }
};
