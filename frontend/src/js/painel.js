/* ============================================================
   painel.js — Preenche o painel (index.html) com dados reais
   vindos de GET /api/dashboard (via window.JC.api).
   Carregar DEPOIS de api.js.
   ============================================================ */
'use strict';

(function () {
  if (document.body.getAttribute('data-page') !== 'painel') return;

  var MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  // "R$ 78,4 mil" para valores grandes; "R$ 950,00" para pequenos
  function moeda(v) {
    v = Number(v) || 0;
    if (Math.abs(v) >= 1000) {
      return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil';
    }
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function stat(key) { return document.querySelector('.stat[data-kpi="' + key + '"]'); }
  function setVal(key, txt) { var s = stat(key); if (s) { var e = s.querySelector('.stat-value'); if (e) e.textContent = txt; } }
  function setSub(key, txt) { var s = stat(key); if (s) { var e = s.querySelector('.stat-sub'); if (e) e.textContent = txt; } }
  function setTrend(key, pct) {
    var s = stat(key); if (!s) return;
    var t = s.querySelector('.trend'); if (!t) return;
    if (pct === null || pct === undefined) { t.style.display = 'none'; return; }
    t.style.display = '';
    var up = Number(pct) >= 0;
    t.className = 'trend ' + (up ? 'up' : 'down');
    t.innerHTML = '<i class="bi bi-arrow-' + (up ? 'up' : 'down') + '-right" aria-hidden="true"></i> ' + Math.abs(pct) + '%';
  }

  function carregando() {
    ['receita', 'servicos', 'projetos', 'areceber'].forEach(function (k) { setVal(k, '…'); });
  }

  function preencher(d) {
    setVal('receita', moeda(d.receita_mes.valor));
    setSub('receita', d.receita_mes.legenda || 'vs. mês anterior');
    setTrend('receita', d.receita_mes.delta_pct);

    setVal('servicos', d.servicos_semana.valor);
    setSub('servicos', d.servicos_semana.legenda || '');
    setTrend('servicos', null);

    setVal('projetos', d.projetos_ativos.valor);
    setSub('projetos', d.projetos_ativos.legenda || '');
    setTrend('projetos', null);

    setVal('areceber', moeda(d.a_receber.valor));
    setSub('areceber', d.a_receber.legenda || '');
    setTrend('areceber', null);

    montarGrafico(d.receita_series || []);
    montarProximos(d.proximos_servicos || []);
  }

  function montarGrafico(serie) {
    var box = document.getElementById('receita-bars');
    if (!box) return;
    if (!serie.length) { box.innerHTML = ''; return; }
    var max = Math.max.apply(null, serie.map(function (p) { return Number(p.valor) || 0; }));
    if (max <= 0) max = 1;
    var ultimo = serie.length - 1;
    box.innerHTML = serie.map(function (p, i) {
      var v = Number(p.valor) || 0;
      var h = Math.max(6, Math.round((v / max) * 100)); // piso de 6% para a barra ficar visível
      var peak = (i === ultimo) ? ' peak' : '';
      var val = 'R$ ' + (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return '<div class="bar-col' + peak + '"><div class="bar-track">' +
             '<div class="bar" data-val="' + val + '" style="height:' + h + '%"></div></div>' +
             '<span class="bar-label">' + esc(cap(p.mes || '')) + '</span></div>';
    }).join('');
  }

  function montarProximos(lista) {
    var box = document.getElementById('proximos-servicos');
    if (!box) return;
    if (!lista.length) { box.innerHTML = '<p class="sched-empty">Nenhum serviço agendado.</p>'; return; }
    box.innerHTML = lista.map(function (s) {
      var partes = String(s.data || '').split('-'); // AAAA-MM-DD
      var dia = partes[2] || '--';
      var mes = MES[partes[1] ? parseInt(partes[1], 10) - 1 : 0] || '';
      var st = (s.status || '').toLowerCase();
      var cls = st === 'pendente' ? 'wait' : (st === 'cancelado' ? 'cancel' : 'ok');
      var txt = st === 'pendente' ? 'Pendente' : (st === 'cancelado' ? 'Cancelado' : 'Confirmado');
      return '<div class="sched-item">' +
        '<div class="sched-day"><span class="d">' + esc(dia) + '</span><span class="m">' + mes + '</span></div>' +
        '<div class="sched-info"><div class="t">' + esc(s.servico) + '</div><div class="c">' + esc(s.cliente) + '</div></div>' +
        '<span class="sched-badge ' + cls + '">' + txt + '</span>' +
        '</div>';
    }).join('');
  }

  async function init() {
    if (!window.JC || !window.JC.api) { console.error('painel: window.JC.api indisponível (api.js carregou?)'); return; }
    carregando();
    try {
      var d = await window.JC.api.dashboard();
      preencher(d);
    } catch (e) {
      console.error('Falha ao carregar o painel:', e);
      ['receita', 'servicos', 'projetos', 'areceber'].forEach(function (k) { setVal(k, '—'); });
    }
  }

  init();
})();