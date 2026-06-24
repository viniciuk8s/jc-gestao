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

    montarProximos(d.proximos_servicos || []);
  }

  // Lucro mensal do ANO corrente = entradas - saídas PAGAS por mês (lucro realizado).
  // Gráfico com linha-base no zero (lucro pode ser negativo); badge de % do
  // mês atual vs o mês anterior. Comparação entre meses é visual (altura das barras).
  async function montarLucroAno() {
    var box = document.getElementById('receita-bars');
    if (!box) return;
    var ano = new Date().getFullYear();
    var curMes = new Date().getMonth(); // 0..11
    var ent = [0,0,0,0,0,0,0,0,0,0,0,0];
    var sai = [0,0,0,0,0,0,0,0,0,0,0,0];
    try {
      var lista = await window.JC.api.lancamentos.list();
      (lista || []).forEach(function (m) {
        if (!m) return;
        if (m.status !== 'pago') return;               // só realizado (igual ao dashboard e ao relatório financeiro)
        var d = String(m.data || '');                 // AAAA-MM-DD
        if (d.slice(0, 4) !== String(ano)) return;     // só o ano corrente
        var mi = parseInt(d.slice(5, 7), 10) - 1;
        if (mi < 0 || mi > 11) return;
        var v = Number(m.valor) || 0;
        if (m.tipo === 'entrada') ent[mi] += v;
        else if (m.tipo === 'saida') sai[mi] += v;
      });
    } catch (e) {
      console.error('Falha ao carregar o lucro do ano:', e);
      box.innerHTML = '<p class="sched-empty">Não foi possível carregar os dados.</p>';
      return;
    }

    var c2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };
    var lucro = ent.map(function (e, i) { return c2(e - sai[i]); });
    var totalAno = c2(lucro.reduce(function (a, b) { return a + b; }, 0));

    // escala pela maior magnitude (positiva ou negativa)
    var maxMag = 1;
    lucro.forEach(function (v) { var a = Math.abs(v); if (a > maxMag) maxMag = a; });

    // legenda do painel: lucro acumulado do ano
    var panel = box.closest('.panel');
    var meta = panel ? panel.querySelector('.panel-meta') : null;
    if (meta) meta.textContent = 'Ano ' + ano + ' · lucro ' + moeda(totalAno);

    function pctBadge(i) {
      // só o mês atual exibe o badge, comparando com o mês anterior
      if (i !== curMes || i === 0) return '';
      var prev = lucro[i - 1], cur = lucro[i];
      var cls, txt, ic;
      if (prev === 0 && cur === 0) { cls = 'flat'; txt = '0%'; ic = ''; }
      else if (prev === 0) { cls = cur > 0 ? 'up' : 'down'; txt = 'novo'; ic = cur > 0 ? 'up' : 'down'; }
      else {
        var pct = Math.round((cur - prev) / Math.abs(prev) * 100);
        cls = pct > 0 ? 'up' : (pct < 0 ? 'down' : 'flat');
        txt = (pct > 0 ? '+' : (pct < 0 ? '−' : '')) + Math.abs(pct) + '%';
        ic = pct > 0 ? 'up' : (pct < 0 ? 'down' : '');
      }
      var icon = ic === 'up' ? '<i class="bi bi-arrow-up-right" aria-hidden="true"></i> '
               : ic === 'down' ? '<i class="bi bi-arrow-down-right" aria-hidden="true"></i> ' : '';
      return '<span class="pf-badge ' + cls + '" title="vs. ' + MES[i - 1] + '">' + icon + txt + '</span>';
    }

    box.innerHTML = lucro.map(function (v, i) {
      var futuro = i > curMes;
      var mag = Math.abs(v);
      var h = (!futuro && v !== 0) ? Math.max(6, Math.round(mag / maxMag * 100)) : 0; // % da altura do plot
      var sign = v > 0 ? 'pos' : (v < 0 ? 'neg' : 'zero');
      var peak = (i === curMes) ? ' peak' : (futuro ? ' future' : '');
      var bar = (!futuro && v !== 0)
        ? '<div class="pf-bar ' + sign + '" data-val="' + moeda(v) + '" style="height:' + h + '%"></div>'
        : '';
      return '<div class="pf-col' + peak + '">' +
               pctBadge(i) +
               '<div class="pf-plot">' + bar + '</div>' +
               '<span class="pf-label">' + MES[i] + '</span>' +
             '</div>';
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
    montarLucroAno(); // lucro mensal do ano = dados reais de /api/lancamentos
  }

  init();
})();