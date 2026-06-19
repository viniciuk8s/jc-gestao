/* ============================================================
   auth-guard.js — Protege as páginas internas do sistema.
   Se não houver sessão ativa no Supabase, redireciona ao login.

   Requer que o supabase.js (que define window.SB) seja carregado
   ANTES deste arquivo. Inclua nas páginas do APP (não no login):

     <script src="src/js/supabase.js"></script>
     <script src="src/js/auth-guard.js"></script>

   Coloque os dois no <head>, antes dos demais scripts, para que a
   verificação aconteça o quanto antes.
   ============================================================ */
(function () {
  'use strict';

  var LOGIN_PAGE = 'login.html';

  // Esconde o conteúdo até confirmar a sessão — evita o "flash"
  // da página protegida aparecendo por um instante antes do redirect.
  var root = document.documentElement;
  var prevVisibility = root.style.visibility;
  root.style.visibility = 'hidden';

  function goLogin() {
    location.replace(LOGIN_PAGE);
  }
  function reveal() {
    root.style.visibility = prevVisibility || '';
  }

  // Sem o cliente do Supabase não há como verificar — falha fechada
  // (segurança): manda para o login em vez de liberar a página.
  if (!window.SB || !window.SB.auth) {
    console.error('[auth-guard] window.SB não encontrado. ' +
      'Carregue supabase.js ANTES de auth-guard.js.');
    goLogin();
    return;
  }

  // Verificação inicial: getSession lê a sessão já persistida (rápido, local).
  window.SB.auth.getSession()
    .then(function (res) {
      var session = res && res.data ? res.data.session : null;
      if (!session) { goLogin(); return; }
      reveal();
    })
    .catch(function () {
      goLogin();
    });

  // Se a sessão cair (logout em outra aba, token expirado), derruba esta também.
  window.SB.auth.onAuthStateChange(function (_event, session) {
    if (!session) goLogin();
  });
})();