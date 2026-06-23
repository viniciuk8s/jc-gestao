/* ============================================================
   permissions.js — Papéis no frontend (UX)
   Lê o papel do usuário (app_metadata.role) e ajusta a interface:
   - admin (CEO/TI): vê tudo, pode tudo.
   - viewer (demais): só visualização — esconde botões de ação.
   A SEGURANÇA real é no backend (gateEscrita); aqui é só usabilidade.
   Carregar DEPOIS de supabase.js/config.js (após api.js, antes do módulo da página).
   ============================================================ */
'use strict';

(function () {
  function injetarCSS() {
    if (document.getElementById('jc-perm-style')) return;
    var st = document.createElement('style');
    st.id = 'jc-perm-style';
    // Para quem é "viewer", esconde ações de escrita.
    st.textContent =
      'body.role-viewer .only-admin,' +
      'body.role-viewer [data-only-admin],' +
      'body.role-viewer .row-del,' +
      'body.role-viewer #cf-add,' +
      'body.role-viewer #pg-add,' +
      'body.role-viewer #ag-add,' +
      'body.role-viewer #rel-novo{display:none !important}';
    document.head.appendChild(st);
  }

  function aplicar(role) {
    var isAdmin = role === 'admin';
    window.JC = Object.assign(window.JC || {}, {
      role: role,
      isAdmin: isAdmin,
      podeEditar: function () { return isAdmin; }
    });
    var b = document.body;
    if (!b) return;
    b.setAttribute('data-role', role);
    b.classList.toggle('role-admin', isAdmin);
    b.classList.toggle('role-viewer', !isAdmin);
    injetarCSS();
  }

  async function init() {
    var role = 'viewer'; // padrão seguro: sem permissão de escrita
    try {
      if (window.SB) {
        var r = await window.SB.auth.getSession();
        var u = (r && r.data && r.data.session) ? r.data.session.user : null;
        var meta = (u && u.app_metadata) || {};
        if (meta.role) role = String(meta.role);
      }
    } catch (e) { /* mantém viewer */ }
    aplicar(role);
  }

  // Reaplica se o body só existir depois
  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();