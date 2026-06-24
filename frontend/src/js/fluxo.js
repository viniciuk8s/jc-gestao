/* ============================================================
   fluxo.js — Fluxo de Caixa (livro-caixa empresarial)
   Dados via API (JC.api.lancamentos). Filtros de período/tipo/busca,
   saldo acumulado realizado, resumo do período, exportação CSV.
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('cf-tbody')) return; // só roda na página do fluxo

  var JC = window.JC;
  // Helpers compartilhados (ver utils.js)
  var esc = JC.esc, fmt = JC.brl, fmtDateBR = JC.fmtDate;
  var gv = JC.val, setVal = JC.setVal, set = JC.setText;

  var SALDO_INICIAL = 0; // saldo de abertura do caixa (ajuste aqui se houver)
  function c2(n) { return Math.round((Number(n) || 0) * 100) / 100; } // evita drift de float

  var state = {
    movs: [],
    period: 30,     // 7 | 30 | 90 | 'all'
    tipo: 'todos',  // 'todos' | 'entrada' | 'saida'
    busca: '',
    carregando: true
  };

  function recurso() { return JC.api.lancamentos; }

  /* ---------- Carregamento (API) ---------- */
  async function carregar() {
    state.carregando = true;
    render();
    try {
      var lista = await recurso().list(); // todos; o filtro é no cliente
      state.movs = (lista || []).map(function (m) {
        m.valor = Number(m.valor) || 0;
        return m;
      });
    } catch (e) {
      console.error('Falha ao carregar lançamentos:', e);
      JC.toast('Não foi possível carregar os lançamentos.', 'error');
      state.movs = [];
    }
    state.carregando = false;
    render();
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
        run = c2(run + (m.tipo === 'entrada' ? m.valor : -m.valor));
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
    return toDate(dataStr) >= min;
  }
  function getFiltered() {
    var q = state.busca.toLowerCase();
    return state.movs.filter(function (m) {
      if (!withinPeriod(m.data)) return false;
      if (state.tipo !== 'todos' && m.tipo !== state.tipo) return false;
      if (q && ((m.descricao || '') + ' ' + (m.categoria || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) {
      return a.data < b.data ? 1 : a.data > b.data ? -1 : 0;
    });
  }

  /* ---------- Render ---------- */
  function render() {
    var tbody = document.getElementById('cf-tbody');

    if (state.carregando) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7"><div class="cf-empty"><p>Carregando…</p></div></td></tr>';
      return;
    }

    var saldos = computeSaldos();
    var rows = getFiltered();

    // Resumo do período (realizado/pago)
    var ent = 0, sai = 0;
    rows.forEach(function (m) {
      if (m.status === 'pago') {
        if (m.tipo === 'entrada') ent += m.valor; else sai += m.valor;
      }
    });
    ent = c2(ent); sai = c2(sai);
    var res = c2(ent - sai);
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
    tbody.innerHTML = '';
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="cf-empty">' +
        '<div class="ico"><i class="bi bi-inbox"></i></div>' +
        '<p>Nenhum lançamento neste período.<br>Use "Novo lançamento" para começar.</p>' +
        '</div></td></tr>';
      return;
    }

    rows.forEach(function (m) {
      var saldo = saldos.map[m.id];
      var saldoCell = saldo === null || saldo === undefined
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

  /* ---------- Ações (API) ---------- */
  function removeMov(id) {
    JC.confirm({ message: 'Excluir este lançamento?', confirmText: 'Excluir', danger: true }).then(async function (ok) {
      if (!ok) return;
      try {
        await recurso().remove(id);
        JC.toast('Lançamento excluído.', 'success');
        await carregar();
      } catch (e) {
        console.error(e);
        JC.toast('Erro ao excluir o lançamento.', 'error');
      }
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
        JC.csvCell(m.descricao),
        JC.csvCell(m.categoria), JC.csvCell(m.forma), m.tipo, m.status,
        (Number(m.valor) || 0).toFixed(2).replace('.', ',')
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

  async function submitForm(e) {
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

    var body = {
      data: data,
      descricao: descricao,
      categoria: gv('f-categoria') || 'Outros',
      forma: gv('f-forma') || 'Pix',
      tipo: gv('f-tipo') || 'entrada',
      status: gv('f-status') || 'pago',
      valor: valor
    };

    var saveBtn = document.querySelector('#cf-form .btn-save');
    if (saveBtn) saveBtn.disabled = true;
    try {
      await recurso().create(body);
      if (window.closeModal) window.closeModal();
      JC.toast('Lançamento adicionado.', 'success');
      await carregar();
    } catch (ex) {
      console.error(ex);
      setErr(ex && ex.message ? ex.message : 'Erro ao salvar o lançamento.');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
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
  if (busca) busca.addEventListener('input', JC.debounce(function () { state.busca = busca.value; render(); }, 200));

  var exp = document.getElementById('cf-export');
  if (exp) exp.addEventListener('click', exportCSV);

  var addBtn = document.getElementById('cf-add');
  if (addBtn) addBtn.addEventListener('click', clearForm);

  var form = document.getElementById('cf-form');
  if (form) form.addEventListener('submit', submitForm);

  /* ---------- Init ---------- */
  carregar();
})();