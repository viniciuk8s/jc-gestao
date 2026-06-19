/* ============================================================
   fluxo.js — Fluxo de Caixa (livro-caixa empresarial)
   Estado em localStorage, filtros de período/tipo/busca,
   saldo acumulado realizado, resumo do período, exportação CSV.
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('cf-tbody')) return; // só roda na página do fluxo

  var JC = window.JC;
  // Helpers compartilhados (ver utils.js)
  var esc = JC.esc, fmt = JC.brl, fmtDateBR = JC.fmtDate;
  var gv = JC.val, setVal = JC.setVal, set = JC.setText;

  var KEY = 'jc_fluxo_caixa';
  var SALDO_INICIAL = 18450.90; // saldo de abertura do caixa

  var state = {
    movs: load(),
    period: 30,     // 7 | 30 | 90 | 'all'
    tipo: 'todos',  // 'todos' | 'entrada' | 'saida'
    busca: ''
  };

  /* ---------- Persistência ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return seed();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state.movs)); } catch (e) {}
  }
  function seed() {
    var base = [
      { data: '2026-06-10', descricao: 'Instalação solar — Cond. Vila Verde', categoria: 'Instalação solar', forma: 'Pix',           tipo: 'entrada', status: 'pago',     valor: 12500 },
      { data: '2026-06-09', descricao: 'Compra de cabos e disjuntores',        categoria: 'Fornecedores',      forma: 'Boleto',        tipo: 'saida',   status: 'pago',     valor: 4200 },
      { data: '2026-06-08', descricao: 'Manutenção elétrica — Mercado São José',categoria: 'Serviços',         forma: 'Transferência', tipo: 'entrada', status: 'pago',     valor: 1850 },
      { data: '2026-06-07', descricao: 'Folha de pagamento — equipe',          categoria: 'Folha de pagamento',forma: 'Transferência', tipo: 'saida',   status: 'pago',     valor: 9800 },
      { data: '2026-06-06', descricao: 'Projeto fotovoltaico — Padaria',       categoria: 'Instalação solar', forma: 'Cartão',        tipo: 'entrada', status: 'pago',     valor: 7600 },
      { data: '2026-06-05', descricao: 'Combustível da frota',                 categoria: 'Combustível',      forma: 'Cartão',        tipo: 'saida',   status: 'pago',     valor: 680 },
      { data: '2026-06-13', descricao: 'Impostos — Simples Nacional',          categoria: 'Impostos',         forma: 'Boleto',        tipo: 'saida',   status: 'pendente', valor: 3100 },
      { data: '2026-06-14', descricao: 'Vistoria de geração — Aldeota',        categoria: 'Serviços',         forma: 'Pix',           tipo: 'entrada', status: 'agendado', valor: 900 }
    ];
    return base.map(function (m, i) { m.id = 'm' + (Date.now() + i); return m; });
  }

  /* ---------- Helpers ---------- */
  function toDate(d) { return new Date(d + 'T00:00:00'); }
  function capStatus(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- Saldo acumulado realizado (todas as movimentações) ---------- */
  function computeSaldos() {
    var sorted = state.movs.slice().sort(function (a, b) {
      return a.data < b.data ? -1 : a.data > b.data ? 1 : 0;
    });
    var run = SALDO_INICIAL;
    var map = {};
    sorted.forEach(function (m) {
      if (m.status === 'pago') {
        run += (m.tipo === 'entrada' ? m.valor : -m.valor);
        map[m.id] = run;
      } else {
        map[m.id] = null; // ainda não impactou o caixa
      }
    });
    return { map: map, saldoCaixa: run };
  }

  /* ---------- Filtro ---------- */
  function withinPeriod(dataStr) {
    if (state.period === 'all') return true;
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var min = new Date(hoje); min.setDate(min.getDate() - Number(state.period));
    return toDate(dataStr) >= min; // do período pra cá (inclui agendados futuros)
  }
  function getFiltered() {
    var q = state.busca.toLowerCase();
    return state.movs.filter(function (m) {
      if (!withinPeriod(m.data)) return false;
      if (state.tipo !== 'todos' && m.tipo !== state.tipo) return false;
      if (q && (m.descricao + ' ' + m.categoria).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) {
      return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; // mais recentes primeiro
    });
  }

  /* ---------- Render ---------- */
  function render() {
    var saldos = computeSaldos();
    var rows = getFiltered();

    // Resumo do período (realizado/pago)
    var ent = 0, sai = 0;
    rows.forEach(function (m) {
      if (m.status === 'pago') {
        if (m.tipo === 'entrada') ent += m.valor; else sai += m.valor;
      }
    });
    var res = ent - sai;
    set('cf-sum-in', fmt(ent));
    set('cf-sum-out', fmt(sai));
    var resEl = document.getElementById('cf-sum-net');
    if (resEl) { resEl.textContent = fmt(res); resEl.className = 'v ' + (res < 0 ? 'neg' : 'pos'); }
    set('cf-sum-caixa', fmt(saldos.saldoCaixa));

    // Contadores de pendências
    var aReceber = state.movs.filter(function (m) { return m.tipo === 'entrada' && m.status !== 'pago'; }).length;
    var aPagar = state.movs.filter(function (m) { return m.tipo === 'saida' && m.status !== 'pago'; }).length;
    var meta = document.getElementById('cf-meta');
    if (meta) {
      meta.innerHTML = '<b>' + rows.length + '</b> lançamento' + (rows.length !== 1 ? 's' : '') +
        ' · <b>' + aReceber + '</b> a receber · <b>' + aPagar + '</b> a pagar';
    }

    // Corpo da tabela
    var tbody = document.getElementById('cf-tbody');
    tbody.innerHTML = '';

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="cf-empty">' +
        '<div class="ico"><i class="bi bi-inbox"></i></div>' +
        '<p>Nenhum lançamento neste período.<br>Use “Novo lançamento” para começar.</p>' +
        '</div></td></tr>';
      return;
    }

    rows.forEach(function (m) {
      var saldo = saldos.map[m.id];
      var saldoCell = saldo === null
        ? '<span class="saldo na">—</span>'
        : '<span class="saldo' + (saldo < 0 ? ' neg' : '') + '">' + fmt(saldo) + '</span>';
      var sinal = m.tipo === 'entrada' ? '+ ' : '− ';
      var valCls = m.tipo === 'entrada' ? 'in' : 'out';

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + fmtDateBR(m.data) + '</td>' +
        '<td class="desc">' + esc(m.descricao) + '</td>' +
        '<td><span class="tag-cat">' + esc(m.categoria) + '</span></td>' +
        '<td class="forma">' + esc(m.forma) + '</td>' +
        '<td><span class="st ' + m.status + '">' + capStatus(m.status) + '</span></td>' +
        '<td class="num"><span class="val ' + valCls + '">' + sinal + fmt(m.valor) + '</span></td>' +
        '<td class="num">' + saldoCell +
          ' <button class="row-del" data-id="' + m.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button></td>';
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.row-del').forEach(function (btn) {
      btn.addEventListener('click', function () { removeMov(btn.dataset.id); });
    });
  }

  /* ---------- Ações ---------- */
  function addMov(m) {
    m.id = 'm' + Date.now();
    state.movs.push(m);
    save();
    render();
    JC.toast('Lançamento adicionado.', 'success');
  }
  function removeMov(id) {
    JC.confirm({ message: 'Excluir este lançamento?', confirmText: 'Excluir', danger: true }).then(function (ok) {
      if (!ok) return;
      state.movs = state.movs.filter(function (m) { return m.id !== id; });
      save();
      render();
      JC.toast('Lançamento excluído.', 'success');
    });
  }

  /* ---------- Exportar CSV ---------- */
  function exportCSV() {
    var rows = getFiltered();
    var head = ['Data', 'Descrição', 'Categoria', 'Forma', 'Tipo', 'Status', 'Valor'];
    var lines = [head.join(';')];
    rows.forEach(function (m) {
      lines.push([
        fmtDateBR(m.data),
        '"' + m.descricao.replace(/"/g, '""') + '"',
        m.categoria, m.forma, m.tipo, m.status,
        m.valor.toFixed(2).replace('.', ',')
      ].join(';'));
    });
    JC.saveCSV('fluxo-de-caixa-' + new Date().toISOString().slice(0, 10) + '.csv', lines);
  }

  /* ---------- Formulário do modal ---------- */
  function clearForm() {
    ['f-descricao', 'f-categoria', 'f-valor'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    setVal('f-tipo', 'entrada');
    setVal('f-forma', 'Pix');
    setVal('f-status', 'pago');
    var d = document.getElementById('f-data');
    if (d) d.value = new Date().toISOString().slice(0, 10);
    var err = document.getElementById('cf-form-error');
    if (err) err.textContent = '';
  }

  function submitForm(e) {
    if (e) e.preventDefault();
    var err = document.getElementById('cf-form-error');
    var setErr = function (msg) { if (err) err.textContent = msg; };

    var descricao = gv('f-descricao');
    var valor = parseFloat(gv('f-valor'));
    var data = gv('f-data');

    if (!descricao) { setErr('Informe a descrição.'); return; }
    if (isNaN(valor) || valor <= 0) { setErr('Informe um valor válido.'); return; }
    if (!data) { setErr('Informe a data.'); return; }
    setErr('');

    addMov({
      data: data,
      descricao: descricao,
      categoria: gv('f-categoria') || 'Outros',
      forma: gv('f-forma') || 'Pix',
      tipo: gv('f-tipo') || 'entrada',
      status: gv('f-status') || 'pago',
      valor: valor
    });

    if (window.closeModal) window.closeModal();
  }

  /* ---------- Eventos ---------- */
  var seg = document.getElementById('cf-period');
  if (seg) {
    seg.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-period]');
      if (!btn) return;
      state.period = btn.dataset.period === 'all' ? 'all' : Number(btn.dataset.period);
      seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      render();
    });
  }
  var tipoSel = document.getElementById('cf-type');
  if (tipoSel) tipoSel.addEventListener('change', function () { state.tipo = tipoSel.value; render(); });

  var busca = document.getElementById('cf-search');
  if (busca) busca.addEventListener('input', function () { state.busca = busca.value; render(); });

  var exp = document.getElementById('cf-export');
  if (exp) exp.addEventListener('click', exportCSV);

  var addBtn = document.getElementById('cf-add');
  if (addBtn) addBtn.addEventListener('click', clearForm); // limpa antes de abrir

  var form = document.getElementById('cf-form');
  if (form) form.addEventListener('submit', submitForm);

  /* ---------- Init ---------- */
  render();
})();