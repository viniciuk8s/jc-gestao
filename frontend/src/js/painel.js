/* ============================================================
   painel.js
   Animações do painel financeiro (números, barras e anel de meta).
   OBS: atualmente o index.html usa charts.js (#chart1/2/3).
   Este arquivo só terá efeito em uma página que contenha os IDs
   abaixo (val-saldo, bar-entradas, ring-circle, refreshBtn, ...).
   Seguro para incluir mesmo onde esses elementos não existem.
   ============================================================ */
'use strict';

(function () {
  // Só roda se o painel financeiro estiver presente.
  if (!document.getElementById('val-saldo')) return;

  /* ── Dados ── */
  var data = {
    saldo:    8320,
    entradas: 13505,
    saidas:   5185,
    invest:   2000,
    maxBar:   15000,
    metaPct:  73,
    metaCirc: 175.9,
  };

  /* ── Helpers ── */
  function byId(id) { return document.getElementById(id); }

  function animateNum(el, target, prefix, duration) {
    if (!el) return;
    var start = null;
    prefix = prefix || '';
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(ease * target).toLocaleString('pt-BR');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function animateBar(el, value, max, delay) {
    if (!el) return;
    setTimeout(function () {
      el.style.width = Math.min((value / max) * 100, 100) + '%';
    }, delay);
  }

  function animateRing(el, pct, circumference, delay) {
    if (!el) return;
    setTimeout(function () {
      var offset = circumference - (pct / 100) * circumference;
      el.style.strokeDashoffset = offset;
    }, delay);
  }

  /* ── Inicializar animações ── */
  function init() {
    animateNum(byId('val-saldo'),    data.saldo,    'R$ ', 900);
    animateNum(byId('val-entradas'), data.entradas, 'R$ ', 900);
    animateNum(byId('val-saidas'),   data.saidas,   'R$ ', 900);
    animateNum(byId('val-invest'),   data.invest,   'R$ ', 900);

    animateBar(byId('bar-entradas'), data.entradas, data.maxBar, 300);
    animateBar(byId('bar-saidas'),   data.saidas,   data.maxBar, 500);
    animateBar(byId('bar-invest'),   data.invest,   data.maxBar, 700);

    animateRing(byId('ring-circle'), data.metaPct, data.metaCirc, 400);

    var lastUpdate = byId('last-update');
    if (lastUpdate) {
      var now = new Date();
      lastUpdate.textContent =
        now.toLocaleDateString('pt-BR') + ' às ' +
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  }

  /* ── Botão Refresh ── */
  var refreshBtn = byId('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      var btn = this;
      btn.classList.add('spinning');

      data.saldo    = Math.round(8000 + Math.random() * 2000);
      data.entradas = Math.round(12000 + Math.random() * 3000);
      data.saidas   = Math.round(4500 + Math.random() * 1500);
      data.invest   = Math.round(1500 + Math.random() * 1000);
      data.metaPct  = Math.round(65 + Math.random() * 20);

      var be = byId('bar-entradas'); if (be) be.style.width = '0%';
      var bs = byId('bar-saidas');   if (bs) bs.style.width = '0%';
      var bi = byId('bar-invest');   if (bi) bi.style.width = '0%';
      var ring = byId('ring-circle'); if (ring) ring.style.strokeDashoffset = data.metaCirc;

      setTimeout(function () {
        btn.classList.remove('spinning');
        init();
      }, 700);
    });
  }

  /* ── Start ── */
  init();
})();