/* api.js — cliente da API do backend (JC Elétrica & Solar).
 * Requer, carregados ANTES:
 *   - supabase.js  -> window.SB  (cliente do Supabase)
 *   - config.js    -> window.JC_CONFIG.API_BASE
 * Expõe: window.JC.api
 */
(function () {
  window.JC = window.JC || {};

  function baseUrl() {
    var b = (window.JC_CONFIG && window.JC_CONFIG.API_BASE) || "";
    return b.replace(/\/+$/, "");
  }

  // pega o token do login do Supabase
  async function getToken() {
    try {
      var r = await window.SB.auth.getSession();
      return r && r.data && r.data.session ? r.data.session.access_token : null;
    } catch (e) {
      return null;
    }
  }

  // monta a query string ignorando vazios/nulos
  function qs(params) {
    if (!params) return "";
    var u = new URLSearchParams();
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v !== undefined && v !== null && v !== "") u.append(k, v);
    });
    var s = u.toString();
    return s ? "?" + s : "";
  }

  async function request(method, path, opts) {
    opts = opts || {};
    var headers = {};
    var token = await getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    var body;
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }

    var res = await fetch(baseUrl() + path + qs(opts.params), {
      method: method,
      headers: headers,
      body: body,
    });

    // sessão inválida/expirada -> volta para o login
    if (res.status === 401 || res.status === 403) {
      try { await window.SB.auth.signOut(); } catch (e) {}
      window.location.replace("login.html");
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (res.status === 204) return null;

    var data = null;
    var text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = text; }
    }

    if (!res.ok) {
      var msg = data && data.detail ? data.detail : "Erro " + res.status;
      var err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // gera os métodos CRUD padrão para um recurso
  function crud(recurso) {
    var p = "/api/" + recurso;
    return {
      list: function (params) { return request("GET", p, { params: params }); },
      get: function (id) { return request("GET", p + "/" + id); },
      create: function (corpo) { return request("POST", p, { body: corpo }); },
      update: function (id, corpo) { return request("PUT", p + "/" + id, { body: corpo }); },
      remove: function (id) { return request("DELETE", p + "/" + id); },
    };
  }

  window.JC.api = {
    request: request, // acesso bruto, se precisar

    dashboard: function () { return request("GET", "/api/dashboard"); },

    funcionarios: crud("funcionarios"),   // list({setor,status}), get, create, update, remove
    lancamentos: crud("lancamentos"),     // list({tipo,status,dias})
    agendamentos: crud("agendamentos"),   // list({de,ate,status})
    projetos: crud("projetos"),           // list() já traz "membros"; create/update aceitam "membros"
    pagamentos: crud("pagamentos"),       // list({funcionario_id,competencia}); itens trazem "funcionario_nome"

    relatorios: {
      resumo: function (params) { return request("GET", "/api/relatorios/resumo", { params: params }); }, // {de,ate}
      fluxoMensal: function (meses) { return request("GET", "/api/relatorios/fluxo-mensal", { params: { meses: meses } }); },
      folha: function (competencia) { return request("GET", "/api/relatorios/folha", { params: { competencia: competencia } }); },
      projetos: function () { return request("GET", "/api/relatorios/projetos"); },
    },
  };
})();