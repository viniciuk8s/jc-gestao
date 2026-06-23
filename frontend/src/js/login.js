/* ============================================================
   login.js — Acesso por etapas (e-mail -> senha) + tela de
   carregamento que "acorda" o backend (warm-up da API).
   Robusto: não quebra se algum elemento estiver ausente.
   Depende de: supabase.js (window.SB) e config.js (window.JC_CONFIG.API_BASE)
   ============================================================ */

(function () {
  'use strict';

  var REDIRECT_APP = 'index.html';
  var RESET_PAGE   = '/redefinir-senha.html';
  var API = (window.JC_CONFIG && window.JC_CONFIG.API_BASE) ? String(window.JC_CONFIG.API_BASE).replace(/\/+$/, '') : '';

  var $ = function (id) { return document.getElementById(id); };

  var form      = $('login-form');
  var emailEl   = $('email');
  var senhaEl   = $('senha');
  var errEl     = $('auth-error');
  var btnCont   = $('btn-continuar');
  var btnEntrar = $('btn-entrar');
  var toggle    = $('toggle-senha');
  var forgot    = $('btn-forgot');
  var toast     = $('toast');
  var stepEmail = $('step-email');
  var stepSenha = $('step-senha');
  var ecMail    = $('ec-mail');
  var btnTrocar = $('btn-trocar');
  var titulo    = $('auth-title');
  var sub       = $('auth-sub');
  var overlay   = $('auth-loading');
  var loaderSub = $('loader-sub');

  if (!form || !emailEl || !senhaEl) { return; } // página incompleta: não faz nada

  var etapa = 'email';

  /* ---------- Helpers ---------- */
  function showError(msg) { if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); } }
  function clearError()   { if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); } }
  function validEmail(v)  { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function sleep(ms)      { return new Promise(function (r) { setTimeout(r, ms); }); }
  function setBtnLoading(btn, on) { if (btn) { btn.classList.toggle('loading', on); btn.disabled = on; } }
  function focar(el) { setTimeout(function () { try { el && el.focus(); } catch (e) {} }, 60); }

  var toastTimer;
  function showToast(msg, type) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3500);
  }

  function mapError(error) {
    var m = (error && error.message ? error.message : '').toLowerCase();
    if (m.indexOf('invalid login') >= 0)                                 return 'E-mail ou senha incorretos.';
    if (m.indexOf('email not confirmed') >= 0)                           return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    if (m.indexOf('rate limit') >= 0 || m.indexOf('too many') >= 0)      return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
    if (m.indexOf('failed to fetch') >= 0 || m.indexOf('network') >= 0)  return 'Falha de conexão. Verifique sua internet.';
    return 'Não foi possível entrar. Tente novamente.';
  }

  /* ---------- Etapas ---------- */
  function irParaEmail() {
    etapa = 'email';
    clearError();
    if (stepSenha) stepSenha.classList.remove('is-active');
    if (stepEmail) stepEmail.classList.add('is-active');
    if (titulo) titulo.textContent = 'Bem-vindo de volta';
    if (sub)    sub.textContent    = 'Entre com sua conta para acessar o painel.';
    focar(emailEl);
  }
  function irParaSenha() {
    etapa = 'senha';
    clearError();
    if (ecMail) ecMail.textContent = emailEl.value.trim();
    if (stepEmail) stepEmail.classList.remove('is-active');
    if (stepSenha) stepSenha.classList.add('is-active');
    if (titulo) titulo.textContent = 'Quase lá';
    if (sub)    sub.textContent    = 'Digite sua senha para entrar.';
    focar(senhaEl);
  }
  function avancarEmail() {
    clearError();
    var email = emailEl.value.trim();
    if (!email)             { showError('Informe seu e-mail.'); return; }
    if (!validEmail(email)) { showError('Informe um e-mail válido.'); return; }
    if (stepSenha) { irParaSenha(); } // só avança se a etapa de senha existir
  }

  /* ---------- Carregamento + warm-up ---------- */
  function mostrarLoading() { if (overlay) { overlay.classList.add('show'); overlay.setAttribute('aria-hidden', 'false'); } }
  function pingHealth() {
    if (!API) return Promise.resolve(false);
    try {
      var ctrl = new AbortController();
      var t = setTimeout(function () { ctrl.abort(); }, 8000);
      return fetch(API + '/health', { cache: 'no-store', signal: ctrl.signal })
        .then(function (r) { clearTimeout(t); return r.ok; })
        .catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }
  async function irParaApp() {
    mostrarLoading();
    var t0 = Date.now();
    var MIN = 1300, MAX = 25000;
    var msgs = ['Conectando ao servidor…', 'Acordando o servidor…', 'Carregando seus dados…', 'Quase pronto…'];
    var i = 0;
    var msgTimer = setInterval(function () { i = (i + 1) % msgs.length; if (loaderSub) loaderSub.textContent = msgs[i]; }, 2600);
    if (API) {
      while (Date.now() - t0 < MAX) { if (await pingHealth()) break; await sleep(1500); }
    } else {
      await sleep(1400);
    }
    var restante = MIN - (Date.now() - t0);
    if (restante > 0) await sleep(restante);
    clearInterval(msgTimer);
    location.replace(REDIRECT_APP);
  }

  /* ---------- Já logado -> entra direto ---------- */
  (async function () {
    if (!window.SB) return;
    try {
      var res = await window.SB.auth.getSession();
      if (res && res.data && res.data.session) { await irParaApp(); }
    } catch (e) { /* segue para o login */ }
  })();

  /* ---------- Eventos ---------- */
  if (btnCont)   btnCont.addEventListener('click', avancarEmail);
  if (btnTrocar) btnTrocar.addEventListener('click', irParaEmail);

  if (toggle) toggle.addEventListener('click', function () {
    var revealing = senhaEl.type === 'password';
    senhaEl.type = revealing ? 'text' : 'password';
    toggle.classList.toggle('revealed', revealing);
    toggle.setAttribute('aria-label', revealing ? 'Ocultar senha' : 'Mostrar senha');
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (etapa === 'email' && stepSenha) { avancarEmail(); return; }

    clearError();
    var email = emailEl.value.trim();
    var senha = senhaEl.value;
    if (!validEmail(email)) { showError('Informe um e-mail válido.'); irParaEmail(); return; }
    if (!senha)             { showError('Digite sua senha.'); return; }
    if (!window.SB)         { showError('Cliente de autenticação não carregado. Confira a configuração do Supabase.'); return; }

    setBtnLoading(btnEntrar, true);
    senhaEl.disabled = true;
    try {
      var r = await window.SB.auth.signInWithPassword({ email: email, password: senha });
      if (r && r.error) { showError(mapError(r.error)); setBtnLoading(btnEntrar, false); senhaEl.disabled = false; return; }
      await irParaApp();
    } catch (err) {
      showError('Erro inesperado. Tente novamente.');
      setBtnLoading(btnEntrar, false); senhaEl.disabled = false;
    }
  });

  if (forgot) forgot.addEventListener('click', async function () {
    clearError();
    var email = emailEl.value.trim();
    if (!validEmail(email)) { showError('Digite seu e-mail no campo acima para receber o link de redefinição.'); irParaEmail(); return; }
    if (!window.SB) { showError('Cliente de autenticação não carregado.'); return; }
    try {
      var r = await window.SB.auth.resetPasswordForEmail(email, { redirectTo: location.origin + RESET_PAGE });
      if (r && r.error) { showError(mapError(r.error)); return; }
      showToast('Enviamos um link de redefinição para seu e-mail.', 'ok');
    } catch (e) { showError('Não foi possível enviar o e-mail agora.'); }
  });

})();