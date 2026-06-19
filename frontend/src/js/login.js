/* ============================================================
   login.js — Lógica da tela de acesso
   Depende de: supabase.js (define window.SB)
   ============================================================ */

(function () {
  'use strict';

  const REDIRECT_APP = 'index.html';            // para onde vai após logar
  const RESET_PAGE   = '/redefinir-senha.html'; // página de nova senha (criar depois)

  const form    = document.getElementById('login-form');
  const emailEl = document.getElementById('email');
  const senhaEl = document.getElementById('senha');
  const errEl   = document.getElementById('auth-error');
  const btn     = document.getElementById('btn-entrar');
  const toggle  = document.getElementById('toggle-senha');
  const forgot  = document.getElementById('btn-forgot');
  const toast   = document.getElementById('toast');

  /* ---------- Se já está logado, vai direto pro painel ---------- */
  (async function checkSession() {
    if (!window.SB) return;
    try {
      const { data } = await window.SB.auth.getSession();
      if (data && data.session) location.replace(REDIRECT_APP);
    } catch (_) { /* segue para o login */ }
  })();

  /* ---------- Helpers de UI ---------- */
  function showError(msg) { errEl.textContent = msg; errEl.classList.add('show'); }
  function clearError()   { errEl.textContent = ''; errEl.classList.remove('show'); }
  function setLoading(on) {
    btn.classList.toggle('loading', on);
    btn.disabled = on;
    emailEl.disabled = on;
    senhaEl.disabled = on;
  }
  let toastTimer;
  function showToast(msg, type) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  /* ---------- Traduz erros do Supabase ---------- */
  function mapError(error) {
    const m = (error && error.message ? error.message : '').toLowerCase();
    if (m.includes('invalid login'))                            return 'E-mail ou senha incorretos.';
    if (m.includes('email not confirmed'))                      return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    if (m.includes('rate limit') || m.includes('too many'))     return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
    if (m.includes('failed to fetch') || m.includes('network')) return 'Falha de conexão. Verifique sua internet.';
    return 'Não foi possível entrar. Tente novamente.';
  }

  /* ---------- Mostrar / ocultar senha ---------- */
  toggle.addEventListener('click', function () {
    const revealing = senhaEl.type === 'password';
    senhaEl.type = revealing ? 'text' : 'password';
    toggle.classList.toggle('revealed', revealing);
    toggle.setAttribute('aria-label', revealing ? 'Ocultar senha' : 'Mostrar senha');
  });

  /* ---------- Submit ---------- */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearError();

    const email = emailEl.value.trim();
    const senha = senhaEl.value;

    if (!email || !senha)   { showError('Preencha e-mail e senha.'); return; }
    if (!validEmail(email)) { showError('Informe um e-mail válido.'); return; }
    if (!window.SB)         { showError('Cliente de autenticação não carregado. Confira a configuração do Supabase.'); return; }

    setLoading(true);
    try {
      const { error } = await window.SB.auth.signInWithPassword({ email: email, password: senha });
      if (error) { showError(mapError(error)); setLoading(false); return; }
      location.replace(REDIRECT_APP);
    } catch (err) {
      showError('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  });

  /* ---------- Esqueci minha senha ---------- */
  forgot.addEventListener('click', async function () {
    clearError();
    const email = emailEl.value.trim();
    if (!validEmail(email)) {
      showError('Digite seu e-mail no campo acima para receber o link de redefinição.');
      emailEl.focus();
      return;
    }
    if (!window.SB) { showError('Cliente de autenticação não carregado.'); return; }
    try {
      const { error } = await window.SB.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + RESET_PAGE
      });
      if (error) { showError(mapError(error)); return; }
      showToast('Enviamos um link de redefinição para seu e-mail.', 'ok');
    } catch (_) {
      showError('Não foi possível enviar o e-mail agora.');
    }
  });

})();