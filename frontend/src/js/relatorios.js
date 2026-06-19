/* ============================================================
   relatorios.js — Relatórios
   1) Pagamentos a funcionários (relatório único por pessoa)
   2) Financeiro do mês (a partir do fluxo de caixa)
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('rel-tabs')) return;

  var KEY_PAG = 'jc_pagamentos';
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var JC = window.JC;
  // Helpers compartilhados (ver utils.js)
  var esc = JC.esc, fmt = JC.brl;
  var fmtDateBR = JC.fmtDate, fmtComp = JC.fmtComp;
  var initials = JC.initials, colorFor = JC.color;
  var set = JC.setText, gv = JC.val, gvSet = JC.setVal;

  var hoje = new Date();
  var state = {
    tab: 'pagamentos',
    pgFunc: '',
    pgAno: String(hoje.getFullYear()),
    finMes: hoje.getMonth(),
    finAno: hoje.getFullYear(),
    pagamentos: loadPag()
  };

  /* ---------- Fontes de dados ---------- */
  function getEmployees() {
    try {
      var raw = localStorage.getItem('jc_funcionarios');
      if (raw) { var a = JSON.parse(raw); if (a && a.length) return a; }
    } catch (e) {}
    return [
      { nome: 'Maria Souza', funcao: 'Engenheira eletricista', dep: 'Elétrica', salario: 8200 },
      { nome: 'Carlos Lima', funcao: 'Técnico em energia solar', dep: 'Solar', salario: 3800 },
      { nome: 'João Pedro', funcao: 'Eletricista', dep: 'Elétrica', salario: 3200 },
      { nome: 'Ana Beatriz', funcao: 'Vendedora', dep: 'Comercial', salario: 2800 },
      { nome: 'Rafael Gomes', funcao: 'Auxiliar técnico', dep: 'Solar', salario: 1900 },
      { nome: 'Patrícia Nunes', funcao: 'Analista financeiro', dep: 'Administrativo', salario: 4500 }
    ];
  }
  function getCashflow() {
    try {
      var raw = localStorage.getItem('jc_fluxo_caixa');
      if (raw) { var a = JSON.parse(raw); if (a && a.length) return a; }
    } catch (e) {}
    return [
      { data: '2026-06-10', descricao: 'Instalação solar — Cond. Vila Verde', categoria: 'Instalação solar', forma: 'Pix', tipo: 'entrada', status: 'pago', valor: 12500 },
      { data: '2026-06-09', descricao: 'Compra de cabos e disjuntores', categoria: 'Fornecedores', forma: 'Boleto', tipo: 'saida', status: 'pago', valor: 4200 },
      { data: '2026-06-08', descricao: 'Manutenção elétrica — Mercado São José', categoria: 'Serviços', forma: 'Transferência', tipo: 'entrada', status: 'pago', valor: 1850 },
      { data: '2026-06-07', descricao: 'Folha de pagamento — equipe', categoria: 'Folha de pagamento', forma: 'Transferência', tipo: 'saida', status: 'pago', valor: 9800 },
      { data: '2026-06-06', descricao: 'Projeto fotovoltaico — Padaria', categoria: 'Instalação solar', forma: 'Cartão', tipo: 'entrada', status: 'pago', valor: 7600 },
      { data: '2026-06-05', descricao: 'Combustível da frota', categoria: 'Combustível', forma: 'Cartão', tipo: 'saida', status: 'pago', valor: 680 }
    ];
  }

  function loadPag() {
    try { var raw = localStorage.getItem(KEY_PAG); if (raw) return JSON.parse(raw); } catch (e) {}
    return seedPag();
  }
  function savePag() { try { localStorage.setItem(KEY_PAG, JSON.stringify(state.pagamentos)); } catch (e) {} }
  function seedPag() {
    var base = [
      { func: 'Maria Souza', tipo: 'Salário', forma: 'Transferência', data: '2026-05-05', comp: '2026-05', valor: 8200, obs: 'Salário mensal' },
      { func: 'Maria Souza', tipo: 'Salário', forma: 'Transferência', data: '2026-06-05', comp: '2026-06', valor: 8200, obs: 'Salário mensal' },
      { func: 'Carlos Lima', tipo: 'Salário', forma: 'Transferência', data: '2026-06-05', comp: '2026-06', valor: 3800, obs: '' },
      { func: 'Carlos Lima', tipo: 'Bônus', forma: 'Pix', data: '2026-06-10', comp: '2026-06', valor: 500, obs: 'Meta de instalações atingida' },
      { func: 'João Pedro', tipo: 'Salário', forma: 'Transferência', data: '2026-06-05', comp: '2026-06', valor: 3200, obs: '' },
      { func: 'Ana Beatriz', tipo: 'Comissão', forma: 'Pix', data: '2026-06-08', comp: '2026-06', valor: 1200, obs: 'Comissão de vendas — maio' }
    ];
    return base.map(function (p, i) { p.id = 'pg' + (Date.now() + i); return p; });
  }

  /* ---------- Selects ---------- */
  function fillSelect(el, items) {
    if (!el) return;
    el.innerHTML = items.map(function (o) {
      return '<option value="' + esc(String(o.v)) + '">' + esc(o.t) + '</option>';
    }).join('');
  }
  function populate() {
    var emps = getEmployees();
    var empOpts = emps.map(function (e) { return { v: e.nome, t: e.nome }; });
    fillSelect(document.getElementById('pg-func'), empOpts);
    fillSelect(document.getElementById('pf-func'), empOpts);
    if (emps.length) state.pgFunc = emps[0].nome;

    var anos = [];
    for (var y = hoje.getFullYear(); y >= hoje.getFullYear() - 3; y--) anos.push({ v: y, t: y });
    anos.unshift({ v: 'all', t: 'Todos os anos' });
    fillSelect(document.getElementById('pg-ano'), anos);
    gvSet('pg-ano', state.pgAno);

    fillSelect(document.getElementById('fin-mes'), MESES.map(function (m, i) { return { v: i, t: m }; }));
    var fAnos = [];
    for (var y2 = hoje.getFullYear(); y2 >= hoje.getFullYear() - 3; y2--) fAnos.push({ v: y2, t: y2 });
    fillSelect(document.getElementById('fin-ano'), fAnos);
    gvSet('fin-mes', state.finMes);
    gvSet('fin-ano', state.finAno);
  }

  /* ============================================================
     ABA 1 — Pagamentos por funcionário
     ============================================================ */
  function renderPagamentos() {
    var box = document.getElementById('pg-report');
    if (!box) return;
    var emps = getEmployees();
    var emp = emps.find(function (e) { return e.nome === state.pgFunc; }) || emps[0];
    if (!emp) {
      box.innerHTML = '<div class="rep-doc"><div class="rep-empty"><div class="ico"><i class="bi bi-people"></i></div><p>Cadastre funcionários para gerar relatórios.</p></div></div>';
      return;
    }

    var pays = state.pagamentos.filter(function (p) {
      if (p.func !== emp.nome) return false;
      if (state.pgAno !== 'all' && p.data.slice(0, 4) !== state.pgAno) return false;
      return true;
    }).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });

    var total = pays.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
    var ultimo = pays.length ? pays[0].data : null;
    var periodoLabel = state.pgAno === 'all' ? 'todos os anos' : state.pgAno;

    var linhas = pays.length
      ? pays.map(function (p) {
          return '<tr>' +
            '<td>' + fmtDateBR(p.data) + '</td>' +
            '<td>' + fmtComp(p.comp) + '</td>' +
            '<td><span class="rep-tag">' + esc(p.tipo) + '</span></td>' +
            '<td>' + esc(p.forma) + '</td>' +
            '<td>' + (p.obs ? esc(p.obs) : '—') + '</td>' +
            '<td class="num">' + fmt(p.valor) + '</td>' +
            '<td class="col-act"><button class="rep-del" data-id="' + p.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button></td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="7"><div class="rep-empty"><div class="ico"><i class="bi bi-cash-stack"></i></div><p>Nenhum pagamento registrado para ' + esc(periodoLabel) + '.</p></div></td></tr>';

    box.innerHTML =
      '<div class="rep-doc">' +
        '<div class="rep-head">' +
          '<div class="rep-brand"><div class="rep-logo">JC</div><div><strong>JC · Elétrica &amp; Solar</strong><span>Relatório de pagamentos</span></div></div>' +
          '<div class="rep-meta">Emitido em<b>' + fmtDateBR(new Date().toISOString().slice(0, 10)) + '</b>Referência: ' + esc(periodoLabel) + '</div>' +
        '</div>' +
        '<div class="rep-emp">' +
          '<div class="av" style="background:' + colorFor(emp.nome) + '">' + esc(initials(emp.nome)) + '</div>' +
          '<div><div class="nm">' + esc(emp.nome) + '</div><div class="role">' + esc(emp.funcao || '') + (emp.dep ? ' · ' + esc(emp.dep) : '') + '</div></div>' +
          '<div class="right"><span class="cap">Salário base</span><span class="vl">' + fmt(emp.salario || 0) + '</span></div>' +
        '</div>' +
        '<div class="rep-summary">' +
          '<div class="rep-sum"><span class="l">Total pago</span><span class="v">' + fmt(total) + '</span></div>' +
          '<div class="rep-sum"><span class="l">Pagamentos</span><span class="v">' + pays.length + '</span></div>' +
          '<div class="rep-sum"><span class="l">Último pagamento</span><span class="v" style="font-size:15px">' + (ultimo ? fmtDateBR(ultimo) : '—') + '</span></div>' +
          '<div class="rep-sum"><span class="l">Referência</span><span class="v" style="font-size:15px">' + esc(periodoLabel) + '</span></div>' +
        '</div>' +
        '<table class="rep-table">' +
          '<thead><tr><th>Data do pagamento</th><th>Competência</th><th>Tipo</th><th>Forma</th><th>Detalhes</th><th class="num">Valor</th><th class="col-act"></th></tr></thead>' +
          '<tbody>' + linhas + '</tbody>' +
        '</table>' +
        '<div class="rep-total"><span class="lbl">Total pago no período</span><span class="amt">' + fmt(total) + '</span></div>' +
        '<div class="rep-foot">JC · Elétrica &amp; Solar — relatório de pagamentos gerado pelo sistema de gestão</div>' +
      '</div>';

    box.querySelectorAll('.rep-del').forEach(function (b) {
      b.addEventListener('click', function () { removePag(b.dataset.id); });
    });
  }

  function removePag(id) {
    JC.confirm({ message: 'Excluir este pagamento do relatório?', confirmText: 'Excluir', danger: true }).then(function (ok) {
      if (!ok) return;
      state.pagamentos = state.pagamentos.filter(function (p) { return p.id !== id; });
      savePag();
      renderPagamentos();
      JC.toast('Pagamento excluído.', 'success');
    });
  }

  /* ============================================================
     ABA 2 — Financeiro do mês
     ============================================================ */
  function renderFinanceiro() {
    var box = document.getElementById('fin-report');
    if (!box) return;
    var ym = state.finAno + '-' + String(state.finMes + 1).padStart(2, '0');

    var movs = getCashflow().filter(function (m) { return m.data.slice(0, 7) === ym && m.status === 'pago'; });
    var entradas = 0, saidas = 0;
    var catIn = {}, catOut = {};
    movs.forEach(function (m) {
      if (m.tipo === 'entrada') { entradas += m.valor; catIn[m.categoria] = (catIn[m.categoria] || 0) + m.valor; }
      else { saidas += m.valor; catOut[m.categoria] = (catOut[m.categoria] || 0) + m.valor; }
    });
    var resultado = entradas - saidas;

    var folha = state.pagamentos.filter(function (p) { return p.comp === ym; })
      .reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);

    function catPanel(title, obj, cls, sideTotal) {
      var arr = Object.keys(obj).map(function (k) { return { nome: k, val: obj[k] }; })
        .sort(function (a, b) { return b.val - a.val; });
      var icon = cls === 'in' ? 'bi-arrow-down-left' : 'bi-arrow-up-right';
      var head = '<div class="cat-panel-head">' +
        '<div class="cat-panel-title"><span class="cat-ico ' + cls + '"><i class="bi ' + icon + '"></i></span>' + title + '</div>' +
        '<span class="cat-panel-total ' + cls + '">' + fmt(sideTotal) + '</span></div>';
      var body;
      if (!arr.length) {
        body = '<div class="cat-list"><p class="cat-empty">Sem lançamentos no período.</p></div>';
      } else {
        body = '<div class="cat-list">' + arr.map(function (c) {
          var pct = sideTotal ? Math.round((c.val / sideTotal) * 100) : 0;
          return '<div class="cat-row">' +
            '<div class="cat-meta">' +
              '<span class="nm"><span class="cat-dot ' + cls + '"></span><span class="txt">' + esc(c.nome) + '</span></span>' +
              '<span class="vl">' + fmt(c.val) + '<em>' + pct + '%</em></span>' +
            '</div>' +
            '<div class="cat-track"><div class="cat-bar ' + cls + '" style="width:' + pct + '%"></div></div>' +
          '</div>';
        }).join('') + '</div>';
      }
      return '<div class="cat-panel">' + head + body + '</div>';
    }

    var lista = movs.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    var linhas = lista.length
      ? lista.map(function (m) {
          var sinal = m.tipo === 'entrada' ? '+ ' : '− ';
          var cls = m.tipo === 'entrada' ? 'in' : 'out';
          return '<tr><td>' + fmtDateBR(m.data) + '</td><td>' + esc(m.descricao) + '</td>' +
            '<td><span class="rep-tag">' + esc(m.categoria) + '</span></td><td>' + esc(m.forma) + '</td>' +
            '<td class="num"><span style="color:var(--' + (cls === 'in' ? 'success' : 'danger') + ');font-weight:700">' + sinal + fmt(m.valor) + '</span></td></tr>';
        }).join('')
      : '<tr><td colspan="5"><div class="rep-empty"><div class="ico"><i class="bi bi-graph-up"></i></div><p>Sem movimentações pagas em ' + MESES[state.finMes] + ' de ' + state.finAno + '.</p></div></td></tr>';

    var resCls = resultado < 0 ? 'neg' : 'pos';

    box.innerHTML =
      '<div class="rep-doc">' +
        '<div class="rep-head">' +
          '<div class="rep-brand"><div class="rep-logo">JC</div><div><strong>JC · Elétrica &amp; Solar</strong><span>Relatório financeiro</span></div></div>' +
          '<div class="rep-meta">Período<b>' + MESES[state.finMes] + ' / ' + state.finAno + '</b>Emitido em ' + fmtDateBR(new Date().toISOString().slice(0, 10)) + '</div>' +
        '</div>' +
        '<div class="rep-summary">' +
          '<div class="rep-sum"><span class="l">Entradas</span><span class="v in">' + fmt(entradas) + '</span></div>' +
          '<div class="rep-sum"><span class="l">Saídas</span><span class="v out">' + fmt(saidas) + '</span></div>' +
          '<div class="rep-sum"><span class="l">Resultado</span><span class="v ' + resCls + '">' + fmt(resultado) + '</span></div>' +
          '<div class="rep-sum"><span class="l">Folha paga no mês</span><span class="v">' + fmt(folha) + '</span></div>' +
        '</div>' +
        '<div class="rep-cols">' +
          catPanel('Receitas por categoria', catIn, 'in', entradas) +
          catPanel('Despesas por categoria', catOut, 'out', saidas) +
        '</div>' +
        '<h3 class="rep-section-title">Movimentações do mês</h3>' +
        '<table class="rep-table">' +
          '<thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th class="num">Valor</th></tr></thead>' +
          '<tbody>' + linhas + '</tbody>' +
        '</table>' +
        '<div class="rep-total"><span class="lbl">Resultado do mês</span><span class="amt" style="color:var(--' + (resultado < 0 ? 'danger' : 'success') + ')">' + fmt(resultado) + '</span></div>' +
        '<div class="rep-foot">JC · Elétrica &amp; Solar — relatório financeiro gerado pelo sistema de gestão</div>' +
      '</div>';
  }

  /* ---------- Modal de pagamento ---------- */
  function openNew() {
    gvSet('pf-id', '');
    gvSet('pf-func', state.pgFunc);
    gvSet('pf-tipo', 'Salário');
    gvSet('pf-forma', 'Transferência');
    gvSet('pf-data', new Date().toISOString().slice(0, 10));
    gvSet('pf-comp', new Date().toISOString().slice(0, 7));
    gvSet('pf-valor', '');
    gvSet('pf-obs', '');
    set('pf-error', '');
    if (window.openModal) window.openModal();
  }
  function submitPag(e) {
    if (e) e.preventDefault();
    var func = gv('pf-func');
    var valor = parseFloat(gv('pf-valor'));
    var data = gv('pf-data');
    if (!func) { set('pf-error', 'Selecione o funcionário.'); return; }
    if (isNaN(valor) || valor <= 0) { set('pf-error', 'Informe um valor válido.'); return; }
    if (!data) { set('pf-error', 'Informe a data do pagamento.'); return; }
    set('pf-error', '');

    state.pagamentos.push({
      id: 'pg' + Date.now(),
      func: func,
      tipo: gv('pf-tipo') || 'Salário',
      forma: gv('pf-forma') || 'Transferência',
      data: data,
      comp: gv('pf-comp') || data.slice(0, 7),
      valor: valor,
      obs: gv('pf-obs')
    });
    savePag();
    state.pgFunc = func;
    gvSet('pg-func', func);
    renderPagamentos();
    JC.toast('Pagamento registrado.', 'success');
    if (window.closeModal) window.closeModal();
  }

  /* ---------- Abas ---------- */
  function setTab(tab) {
    state.tab = tab;
    document.getElementById('tab-pagamentos').hidden = (tab !== 'pagamentos');
    document.getElementById('tab-financeiro').hidden = (tab !== 'financeiro');
    document.querySelectorAll('#rel-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    if (tab === 'pagamentos') renderPagamentos(); else renderFinanceiro();
  }

  /* ---------- Exportar CSV (conforme aba) ---------- */
  function exportCSV() {
    var lines, fname;
    if (state.tab === 'pagamentos') {
      var pays = state.pagamentos.filter(function (p) {
        return p.func === state.pgFunc && (state.pgAno === 'all' || p.data.slice(0, 4) === state.pgAno);
      }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      lines = ['Funcionário;Data;Competência;Tipo;Forma;Valor;Detalhes'];
      pays.forEach(function (p) {
        lines.push([
          '"' + p.func + '"', fmtDateBR(p.data), fmtComp(p.comp), p.tipo, p.forma,
          Number(p.valor).toFixed(2).replace('.', ','), '"' + (p.obs || '').replace(/"/g, '""') + '"'
        ].join(';'));
      });
      fname = 'pagamentos-' + state.pgFunc.toLowerCase().replace(/\s+/g, '-') + '-' + state.pgAno + '.csv';
    } else {
      var ym = state.finAno + '-' + String(state.finMes + 1).padStart(2, '0');
      var movs = getCashflow().filter(function (m) { return m.data.slice(0, 7) === ym && m.status === 'pago'; })
        .sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      lines = ['Data;Descrição;Categoria;Forma;Tipo;Valor'];
      movs.forEach(function (m) {
        lines.push([
          fmtDateBR(m.data), '"' + m.descricao.replace(/"/g, '""') + '"', m.categoria, m.forma, m.tipo,
          Number(m.valor).toFixed(2).replace('.', ',')
        ].join(';'));
      });
      fname = 'financeiro-' + ym + '.csv';
    }
    JC.saveCSV(fname, lines);
  }

  /* ---------- Eventos ---------- */
  document.getElementById('rel-tabs')?.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-tab]');
    if (btn) setTab(btn.dataset.tab);
  });
  document.getElementById('pg-func')?.addEventListener('change', function (e) { state.pgFunc = e.target.value; renderPagamentos(); });
  document.getElementById('pg-ano')?.addEventListener('change', function (e) { state.pgAno = e.target.value; renderPagamentos(); });
  document.getElementById('fin-mes')?.addEventListener('change', function (e) { state.finMes = Number(e.target.value); renderFinanceiro(); });
  document.getElementById('fin-ano')?.addEventListener('change', function (e) { state.finAno = Number(e.target.value); renderFinanceiro(); });
  document.getElementById('pg-add')?.addEventListener('click', openNew);
  document.getElementById('pg-form')?.addEventListener('submit', submitPag);
  document.getElementById('rel-export')?.addEventListener('click', exportCSV);
  document.getElementById('rel-print')?.addEventListener('click', function () { window.print(); });

  /* ---------- Init ---------- */
  populate();
  renderPagamentos();
  renderFinanceiro();
})();