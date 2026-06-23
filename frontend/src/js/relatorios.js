/* ============================================================
   relatorios.js — Relatórios (100% conectado ao back-end)
   1) Registro de trabalho (jornadas)  → JC.api.jornadas
   2) Pagamentos a funcionários        → JC.api.pagamentos
   3) Financeiro do mês                → JC.api.lancamentos + pagamentos
   Funcionários (jornadas e pagamentos) são referenciados por ID (FK).
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('rel-tabs')) return;

  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var JC = window.JC;
  var esc = JC.esc, fmt = JC.brl;
  var fmtDateBR = JC.fmtDate, fmtComp = JC.fmtComp;
  var initials = JC.initials, colorFor = JC.color;
  var set = JC.setText, gv = JC.val, gvSet = JC.setVal;

  var hoje = new Date();
  var state = {
    tab: 'trabalho',
    wkFunc: '',                 // jornadas: por ID (FK)
    wkAno: String(hoje.getFullYear()),
    pgFunc: '',                 // pagamentos: por ID (FK)
    pgAno: String(hoje.getFullYear()),
    finMes: hoje.getMonth(),
    finAno: hoje.getFullYear(),
    emps: [],                   // funcionários (API): {id, nome, funcao, setor, salario}
    lancamentos: [],            // fluxo de caixa (API)
    pagamentos: [],             // pagamentos (API)
    jornadas: []                // jornadas (API)
  };

  /* ---------- Fontes de dados (API) ---------- */
  function getEmployees() { return state.emps; }
  function empById(id) { return state.emps.find(function (e) { return String(e.id) === String(id); }) || null; }

  async function carregarEmps() {
    try {
      var lista = await JC.api.funcionarios.list();
      state.emps = (lista || []).map(function (f) {
        return { id: f.id, nome: f.nome, funcao: f.funcao, setor: f.setor, salario: f.salario == null ? 0 : Number(f.salario) };
      });
    } catch (e) { console.error('Falha ao carregar funcionários:', e); state.emps = []; }
  }
  async function carregarPagamentos() {
    try { state.pagamentos = (await JC.api.pagamentos.list()) || []; }
    catch (e) { console.error('Falha ao carregar pagamentos:', e); state.pagamentos = []; }
  }
  async function carregarLancamentos() {
    try { state.lancamentos = (await JC.api.lancamentos.list()) || []; }
    catch (e) { console.error('Falha ao carregar lançamentos:', e); state.lancamentos = []; }
  }
  async function carregarJornadas() {
    try { state.jornadas = (await JC.api.jornadas.list()) || []; }
    catch (e) { console.error('Falha ao carregar jornadas:', e); state.jornadas = []; }
  }

  /* ---------- Tempo / horas ---------- */
  function minutesOf(t) {
    if (!t) return null;
    var p = String(t).split(':');
    if (p.length < 2) return null;
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  }
  function minutosTrabalhados(entrada, saida) {
    var a = minutesOf(entrada), b = minutesOf(saida);
    if (a == null || b == null) return 0;
    var d = b - a;
    if (d < 0) d += 1440;
    return d;
  }
  function horasStr(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (!h && !m) return '—';
    return h + 'h' + (m ? ' ' + String(m).padStart(2, '0') + 'min' : '');
  }

  /* ---------- Selects ---------- */
  function fillSelect(el, items) {
    if (!el) return;
    el.innerHTML = items.map(function (o) {
      return '<option value="' + esc(String(o.v)) + '">' + esc(o.t) + '</option>';
    }).join('');
  }
  function anosOptions(comTodos) {
    var anos = [];
    for (var y = hoje.getFullYear(); y >= hoje.getFullYear() - 3; y--) anos.push({ v: y, t: y });
    if (comTodos) anos.unshift({ v: 'all', t: 'Todos os anos' });
    return anos;
  }
  function populate() {
    var emps = state.emps;
    if (emps.length) {
      state.wkFunc = String(emps[0].id);    // jornadas por id (FK)
      state.pgFunc = String(emps[0].id);    // pagamentos por id (FK)
    }
    var empIdOptsWk = emps.map(function (e) { return { v: e.id, t: e.nome }; });
    // Aba: registro de trabalho (por id — FK do back-end)
    fillSelect(document.getElementById('wk-func'), empIdOptsWk);
    fillSelect(document.getElementById('wk-ano'), anosOptions(true));
    gvSet('wk-ano', state.wkAno);
    if (emps.length) gvSet('wk-func', state.wkFunc);

    // Aba: pagamentos (por id — FK do back-end)
    var empIdOpts = emps.map(function (e) { return { v: e.id, t: e.nome }; });
    fillSelect(document.getElementById('pg-func'), empIdOpts);
    fillSelect(document.getElementById('pf-func'), empIdOpts);
    fillSelect(document.getElementById('pg-ano'), anosOptions(true));
    gvSet('pg-ano', state.pgAno);
    if (emps.length) gvSet('pg-func', state.pgFunc);

    // Aba: financeiro
    fillSelect(document.getElementById('fin-mes'), MESES.map(function (m, i) { return { v: i, t: m }; }));
    fillSelect(document.getElementById('fin-ano'), anosOptions(false));
    gvSet('fin-mes', state.finMes);
    gvSet('fin-ano', state.finAno);
  }

  /* ============================================================
     ABA 1 — Registro de trabalho (⚠ LOCAL, sem back-end)
     ============================================================ */
  function renderTrabalho() {
    var box = document.getElementById('wk-report');
    if (!box) return;
    var emp = empById(state.wkFunc) || state.emps[0];
    if (!emp) {
      box.innerHTML = '<div class="rep-doc"><div class="rep-empty"><div class="ico"><i class="bi bi-people"></i></div><p>Cadastre funcionários para gerar relatórios.</p></div></div>';
      return;
    }

    var regs = state.jornadas.filter(function (r) {
      if (String(r.funcionarioId) !== String(emp.id)) return false;
      if (state.wkAno !== 'all' && String(r.data).slice(0, 4) !== state.wkAno) return false;
      return true;
    }).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });

    var totalMin = regs.reduce(function (s, r) { return s + minutosTrabalhados(r.entrada, r.saida); }, 0);
    var totalDesp = regs.reduce(function (s, r) { return s + Number(r.despesa || 0); }, 0);
    var periodoLabel = state.wkAno === 'all' ? 'todos os anos' : state.wkAno;

    var linhas = regs.length
      ? regs.map(function (r) {
          var min = minutosTrabalhados(r.entrada, r.saida);
          var despCell = Number(r.despesa) > 0
            ? '<span class="exp">' + fmt(r.despesa) + '</span>' + (r.despesaDesc ? '<span class="exp-desc">' + esc(r.despesaDesc) + '</span>' : '')
            : '<span class="exp-none">—</span>';
          return '<tr>' +
            '<td data-label="Data">' + fmtDateBR(r.data) + '</td>' +
            '<td data-label="Entrada">' + esc(r.entrada || '—') + '</td>' +
            '<td data-label="Saída">' + esc(r.saida || '—') + '</td>' +
            '<td data-label="Horas"><span class="rep-tag">' + horasStr(min) + '</span></td>' +
            '<td class="activity" data-label="O que foi feito">' + (r.atividade ? esc(r.atividade) : '—') + '</td>' +
            '<td class="num" data-label="Despesa">' + despCell + '</td>' +
            '<td class="col-act"><button class="rep-del" data-id="' + r.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button></td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="7"><div class="rep-empty"><div class="ico"><i class="bi bi-clock-history"></i></div><p>Nenhum dia de trabalho registrado para ' + esc(periodoLabel) + '.</p></div></td></tr>';

    box.innerHTML =
      '<div class="rep-doc">' +
        '<div class="rep-head">' +
          '<div class="rep-brand"><img class="rep-logo" width="40" src="src/img/icone-laranja.png" alt=""><div><strong>JC · Elétrica &amp; Solar</strong><span>Registro de trabalho</span></div></div>' +
          '<div class="rep-meta">Emitido em<b>' + fmtDateBR(new Date().toISOString().slice(0, 10)) + '</b>Referência: ' + esc(periodoLabel) + '</div>' +
        '</div>' +
        '<div class="rep-emp">' +
          '<div class="av" style="background:' + colorFor(emp.nome) + '">' + esc(initials(emp.nome)) + '</div>' +
          '<div><div class="nm">' + esc(emp.nome) + '</div><div class="role">' + esc(emp.funcao || '') + (emp.setor ? ' · ' + esc(emp.setor) : '') + '</div></div>' +
          '<div class="right"><span class="cap">Total de horas</span><span class="vl">' + horasStr(totalMin) + '</span></div>' +
        '</div>' +
        '<div class="rep-summary">' +
          '<div class="rep-sum"><span class="l">Dias registrados</span><span class="v">' + regs.length + '</span></div>' +
          '<div class="rep-sum"><span class="l">Total de horas</span><span class="v" style="font-size:18px">' + horasStr(totalMin) + '</span></div>' +
          '<div class="rep-sum"><span class="l">Total de despesas</span><span class="v out">' + fmt(totalDesp) + '</span></div>' +
          '<div class="rep-sum"><span class="l">Referência</span><span class="v" style="font-size:15px">' + esc(periodoLabel) + '</span></div>' +
        '</div>' +
        '<table class="rep-table">' +
          '<thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Horas</th><th>O que foi feito</th><th class="num">Despesa</th><th class="col-act"></th></tr></thead>' +
          '<tbody>' + linhas + '</tbody>' +
        '</table>' +
        '<div class="rep-total"><span class="lbl">Total de horas no período</span><span class="amt">' + horasStr(totalMin) + '</span></div>' +
        '<div class="rep-foot">JC · Elétrica &amp; Solar — registro de trabalho gerado pelo sistema de gestão</div>' +
      '</div>';

    box.querySelectorAll('.rep-del').forEach(function (b) {
      b.addEventListener('click', function () { removeWk(b.dataset.id); });
    });
  }

  function removeWk(id) {
    JC.confirm({ message: 'Excluir este registro de trabalho?', confirmText: 'Excluir', danger: true }).then(async function (ok) {
      if (!ok) return;
      try {
        await JC.api.jornadas.remove(id);
        await carregarJornadas();
        renderTrabalho();
        JC.toast('Registro excluído.', 'success');
      } catch (e) {
        console.error(e);
        JC.toast(e && e.message ? e.message : 'Erro ao excluir o registro.', 'error');
      }
    });
  }

  function openNewTrabalho() {
    var emps = getEmployees();
    JC.modal.open({
      title: 'Registrar dia de trabalho',
      subtitle: 'Jornada e atividades do funcionário',
      submitText: 'Salvar registro',
      fields: [
        { id: 'func', label: 'Funcionário', type: 'select', required: true, value: state.wkFunc,
          options: emps.map(function (e) { return { value: e.id, label: e.nome }; }) },
        { id: 'data', label: 'Data', type: 'date', required: true, half: true, value: new Date().toISOString().slice(0, 10) },
        { id: 'entrada', label: 'Entrada', type: 'time', required: true, half: true, value: '08:00' },
        { id: 'saida', label: 'Saída', type: 'time', required: true, half: true, value: '17:00' },
        { id: 'atividade', label: 'O que foi feito', type: 'textarea', rows: 3, required: true, placeholder: 'Descreva o serviço/atividade realizada no dia' },
        { id: 'despesaValor', label: 'Despesa (R$)', type: 'number', step: '0.01', min: '0', half: true, inputmode: 'decimal', placeholder: '0,00 (opcional)' },
        { id: 'despesaDesc', label: 'Descrição da despesa', type: 'text', half: true, placeholder: 'Ex.: combustível, material' }
      ],
      onReady: function (ctrl) {
        var ent = ctrl.input('entrada'), sai = ctrl.input('saida'), dv = ctrl.input('despesaValor');
        function calcHoras() {
          var min = minutosTrabalhados(ent.value, sai.value);
          ctrl.setHint('saida', min > 0 ? ('Jornada: ' + horasStr(min)) : 'A saída deve ser depois da entrada.');
        }
        function calcDesp() {
          var v = parseFloat(String(dv.value).replace(',', '.'));
          ctrl.setHint('despesaValor', (!isNaN(v) && v > 0) ? ('Despesa lançada: ' + fmt(v)) : 'Opcional — em branco se não houve.');
        }
        if (ent && sai) { ent.addEventListener('input', calcHoras); sai.addEventListener('input', calcHoras); calcHoras(); }
        if (dv) { dv.addEventListener('input', calcDesp); calcDesp(); }
      },
      onSubmit: async function (vals) {
        if (minutosTrabalhados(vals.entrada, vals.saida) <= 0) {
          throw new Error('A saída deve ser depois da entrada.');
        }
        var funcionarioId = Number(vals.func);
        if (!funcionarioId) throw new Error('Selecione um funcionário.');
        var desp = parseFloat(String(vals.despesaValor).replace(',', '.'));
        if (isNaN(desp) || desp < 0) desp = 0;
        var body = {
          funcionarioId: funcionarioId,
          data: vals.data,
          entrada: vals.entrada,
          saida: vals.saida,
          atividade: String(vals.atividade).trim(),
          despesa: desp,
          despesaDesc: String(vals.despesaDesc || '').trim() || null
        };
        await JC.api.jornadas.create(body);
        state.wkFunc = String(funcionarioId);
        gvSet('wk-func', state.wkFunc);
        await carregarJornadas();
        renderTrabalho();
        JC.toast('Dia de trabalho registrado.', 'success');
      }
    });
  }

  /* ============================================================
     ABA 2 — Pagamentos por funcionário (100% API)
     ============================================================ */
  function renderPagamentos() {
    var box = document.getElementById('pg-report');
    if (!box) return;
    var emp = empById(state.pgFunc) || state.emps[0];
    if (!emp) {
      box.innerHTML = '<div class="rep-doc"><div class="rep-empty"><div class="ico"><i class="bi bi-people"></i></div><p>Cadastre funcionários para gerar relatórios.</p></div></div>';
      return;
    }

    var pays = state.pagamentos.filter(function (p) {
      if (String(p.funcionarioId) !== String(emp.id)) return false;
      if (state.pgAno !== 'all' && String(p.data).slice(0, 4) !== state.pgAno) return false;
      return true;
    }).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });

    var total = pays.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
    var ultimo = pays.length ? pays[0].data : null;
    var periodoLabel = state.pgAno === 'all' ? 'todos os anos' : state.pgAno;

    var linhas = pays.length
      ? pays.map(function (p) {
          return '<tr>' +
            '<td data-label="Data">' + fmtDateBR(p.data) + '</td>' +
            '<td data-label="Competência">' + fmtComp(p.competencia) + '</td>' +
            '<td data-label="Tipo"><span class="rep-tag">' + esc(p.tipo || '—') + '</span></td>' +
            '<td data-label="Forma">' + esc(p.forma || '—') + '</td>' +
            '<td data-label="Detalhes">' + (p.obs ? esc(p.obs) : '—') + '</td>' +
            '<td class="num" data-label="Valor">' + fmt(p.valor) + '</td>' +
            '<td class="col-act"><button class="rep-del" data-id="' + p.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button></td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="7"><div class="rep-empty"><div class="ico"><i class="bi bi-cash-stack"></i></div><p>Nenhum pagamento registrado para ' + esc(periodoLabel) + '.</p></div></td></tr>';

    box.innerHTML =
      '<div class="rep-doc">' +
        '<div class="rep-head">' +
          '<div class="rep-brand"><img class="rep-logo" width="40" src="src/img/icone-laranja.png" alt=""><div><strong>JC · Elétrica &amp; Solar</strong><span>Relatório de pagamentos</span></div></div>' +
          '<div class="rep-meta">Emitido em<b>' + fmtDateBR(new Date().toISOString().slice(0, 10)) + '</b>Referência: ' + esc(periodoLabel) + '</div>' +
        '</div>' +
        '<div class="rep-emp">' +
          '<div class="av" style="background:' + colorFor(emp.nome) + '">' + esc(initials(emp.nome)) + '</div>' +
          '<div><div class="nm">' + esc(emp.nome) + '</div><div class="role">' + esc(emp.funcao || '') + (emp.setor ? ' · ' + esc(emp.setor) : '') + '</div></div>' +
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
    JC.confirm({ message: 'Excluir este pagamento do relatório?', confirmText: 'Excluir', danger: true }).then(async function (ok) {
      if (!ok) return;
      try {
        await JC.api.pagamentos.remove(id);
        await carregarPagamentos();
        renderPagamentos();
        JC.toast('Pagamento excluído.', 'success');
      } catch (e) {
        console.error(e);
        JC.toast(e && e.message ? e.message : 'Erro ao excluir o pagamento.', 'error');
      }
    });
  }

  function openNewPagamento() {
    var emps = getEmployees();
    JC.modal.open({
      title: 'Registrar pagamento',
      subtitle: 'Lance um pagamento efetuado a um funcionário',
      submitText: 'Salvar pagamento',
      fields: [
        { id: 'func', label: 'Funcionário', type: 'select', required: true, value: state.pgFunc,
          options: emps.map(function (e) { return { value: e.id, label: e.nome }; }) },
        { id: 'tipo', label: 'Tipo de pagamento', type: 'select', half: true,
          options: ['Salário', 'Adiantamento', 'Bônus', 'Comissão', 'Vale', 'Férias', '13º salário'] },
        { id: 'forma', label: 'Forma de pagamento', type: 'select', half: true,
          options: ['Transferência', 'Pix', 'Dinheiro', 'Cartão'] },
        { id: 'data', label: 'Data do pagamento', type: 'date', required: true, half: true, value: new Date().toISOString().slice(0, 10) },
        { id: 'comp', label: 'Competência', type: 'month', half: true, value: new Date().toISOString().slice(0, 7) },
        { id: 'valor', label: 'Valor (R$)', type: 'number', step: '0.01', min: '0', required: true, inputmode: 'decimal', placeholder: '0,00' },
        { id: 'obs', label: 'Detalhes', type: 'textarea', rows: 2, placeholder: 'Ex: referente ao mês, horas extras, meta atingida...' }
      ],
      onReady: function (ctrl) {
        var data = ctrl.input('data'), comp = ctrl.input('comp'), valor = ctrl.input('valor'), tipo = ctrl.input('tipo');
        var compEditado = false;
        if (comp) comp.addEventListener('input', function () { compEditado = true; });
        function syncComp() { if (data && comp && !compEditado && data.value) comp.value = data.value.slice(0, 7); }
        if (data) { data.addEventListener('change', syncComp); syncComp(); }
        function preview() {
          var v = parseFloat(String(valor.value).replace(',', '.'));
          ctrl.setHint('valor', (!isNaN(v) && v > 0)
            ? (fmt(v) + (tipo && tipo.value ? ' · ' + tipo.value : ''))
            : 'Informe o valor pago.');
        }
        if (valor) { valor.addEventListener('input', preview); preview(); }
        if (tipo) tipo.addEventListener('change', preview);
      },
      onSubmit: async function (vals) {
        var valor = parseFloat(String(vals.valor).replace(',', '.'));
        if (isNaN(valor) || valor <= 0) throw new Error('Informe um valor válido.');
        var funcionarioId = Number(vals.func);
        if (!funcionarioId) throw new Error('Selecione um funcionário.');
        var data = vals.data;
        var body = {
          funcionarioId: funcionarioId,
          tipo: vals.tipo || 'Salário',
          forma: vals.forma || 'Transferência',
          data: data,
          competencia: vals.comp || String(data).slice(0, 7),
          valor: valor,
          obs: String(vals.obs || '').trim() || null
        };
        await JC.api.pagamentos.create(body);
        state.pgFunc = String(funcionarioId);
        gvSet('pg-func', state.pgFunc);
        await carregarPagamentos();
        renderPagamentos();
        JC.toast('Pagamento registrado.', 'success');
      }
    });
  }

  /* ============================================================
     ABA 3 — Financeiro do mês (100% API: lançamentos + folha reais)
     ============================================================ */
  function renderFinanceiro() {
    var box = document.getElementById('fin-report');
    if (!box) return;
    var ym = state.finAno + '-' + String(state.finMes + 1).padStart(2, '0');

    var movs = state.lancamentos.filter(function (m) { return String(m.data).slice(0, 7) === ym && m.status === 'pago'; });
    var entradas = 0, saidas = 0;
    var catIn = {}, catOut = {};
    movs.forEach(function (m) {
      var v = Number(m.valor) || 0;
      if (m.tipo === 'entrada') { entradas += v; catIn[m.categoria] = (catIn[m.categoria] || 0) + v; }
      else { saidas += v; catOut[m.categoria] = (catOut[m.categoria] || 0) + v; }
    });
    var resultado = entradas - saidas;

    // Folha paga no mês = soma dos pagamentos com competência = ym (dado real da API)
    var folha = state.pagamentos.filter(function (p) { return p.competencia === ym; })
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
              '<span class="nm"><span class="cat-dot ' + cls + '"></span><span class="txt">' + esc(c.nome || 'Sem categoria') + '</span></span>' +
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
          return '<tr><td data-label="Data">' + fmtDateBR(m.data) + '</td><td data-label="Descrição">' + esc(m.descricao) + '</td>' +
            '<td data-label="Categoria"><span class="rep-tag">' + esc(m.categoria || '—') + '</span></td><td data-label="Forma">' + esc(m.forma || '—') + '</td>' +
            '<td class="num" data-label="Valor"><span style="color:var(--' + (cls === 'in' ? 'success' : 'danger') + ');font-weight:700">' + sinal + fmt(m.valor) + '</span></td></tr>';
        }).join('')
      : '<tr><td colspan="5"><div class="rep-empty"><div class="ico"><i class="bi bi-graph-up"></i></div><p>Sem movimentações pagas em ' + MESES[state.finMes] + ' de ' + state.finAno + '.</p></div></td></tr>';

    var resCls = resultado < 0 ? 'neg' : 'pos';

    box.innerHTML =
      '<div class="rep-doc">' +
        '<div class="rep-head">' +
          '<div class="rep-brand"><div><strong>JC · Elétrica &amp; Solar</strong><span>Relatório financeiro</span></div></div>' +
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

  /* ---------- Abas ---------- */
  function setTab(tab) {
    state.tab = tab;
    document.getElementById('tab-trabalho').hidden = (tab !== 'trabalho');
    document.getElementById('tab-pagamentos').hidden = (tab !== 'pagamentos');
    document.getElementById('tab-financeiro').hidden = (tab !== 'financeiro');
    document.querySelectorAll('#rel-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    if (tab === 'trabalho') renderTrabalho();
    else if (tab === 'pagamentos') renderPagamentos();
    else renderFinanceiro();
  }

  /* ---------- Exportar CSV (conforme aba) ---------- */
  function exportCSV() {
    var lines, fname;
    if (state.tab === 'trabalho') {
      var empWk = empById(state.wkFunc);
      var regs = state.jornadas.filter(function (r) {
        return String(r.funcionarioId) === String(state.wkFunc) && (state.wkAno === 'all' || String(r.data).slice(0, 4) === state.wkAno);
      }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      lines = ['Funcionário;Data;Entrada;Saída;Horas;O que foi feito;Despesa;Descrição despesa'];
      regs.forEach(function (r) {
        lines.push([
          JC.csvCell(r.funcionario_nome || (empWk && empWk.nome) || ''), fmtDateBR(r.data), r.entrada, r.saida,
          horasStr(minutosTrabalhados(r.entrada, r.saida)),
          JC.csvCell(r.atividade || ''),
          Number(r.despesa || 0).toFixed(2).replace('.', ','),
          JC.csvCell(r.despesaDesc || '')
        ].join(';'));
      });
      fname = 'registro-trabalho-' + String(empWk ? empWk.nome : 'funcionario').toLowerCase().replace(/\s+/g, '-') + '-' + state.wkAno + '.csv';
    } else if (state.tab === 'pagamentos') {
      var emp = empById(state.pgFunc);
      var pays = state.pagamentos.filter(function (p) {
        return String(p.funcionarioId) === String(state.pgFunc) && (state.pgAno === 'all' || String(p.data).slice(0, 4) === state.pgAno);
      }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      lines = ['Funcionário;Data;Competência;Tipo;Forma;Valor;Detalhes'];
      pays.forEach(function (p) {
        lines.push([
          JC.csvCell(p.funcionario_nome || (emp && emp.nome) || ''), fmtDateBR(p.data), fmtComp(p.competencia), p.tipo || '', p.forma || '',
          Number(p.valor || 0).toFixed(2).replace('.', ','), JC.csvCell(p.obs || '')
        ].join(';'));
      });
      fname = 'pagamentos-' + String(emp ? emp.nome : 'funcionario').toLowerCase().replace(/\s+/g, '-') + '-' + state.pgAno + '.csv';
    } else {
      var ym = state.finAno + '-' + String(state.finMes + 1).padStart(2, '0');
      var movs = state.lancamentos.filter(function (m) { return String(m.data).slice(0, 7) === ym && m.status === 'pago'; })
        .sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      lines = ['Data;Descrição;Categoria;Forma;Tipo;Valor'];
      movs.forEach(function (m) {
        lines.push([
          fmtDateBR(m.data), JC.csvCell(m.descricao), m.categoria || '', m.forma || '', m.tipo,
          Number(m.valor || 0).toFixed(2).replace('.', ',')
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
  document.getElementById('wk-func')?.addEventListener('change', function (e) { state.wkFunc = e.target.value; renderTrabalho(); });
  document.getElementById('wk-ano')?.addEventListener('change', function (e) { state.wkAno = e.target.value; renderTrabalho(); });
  document.getElementById('wk-add')?.addEventListener('click', openNewTrabalho);
  document.getElementById('pg-func')?.addEventListener('change', function (e) { state.pgFunc = e.target.value; renderPagamentos(); });
  document.getElementById('pg-ano')?.addEventListener('change', function (e) { state.pgAno = e.target.value; renderPagamentos(); });
  document.getElementById('fin-mes')?.addEventListener('change', function (e) { state.finMes = Number(e.target.value); renderFinanceiro(); });
  document.getElementById('fin-ano')?.addEventListener('change', function (e) { state.finAno = Number(e.target.value); renderFinanceiro(); });
  document.getElementById('pg-add')?.addEventListener('click', openNewPagamento);
  document.getElementById('rel-export')?.addEventListener('click', exportCSV);
  document.getElementById('rel-print')?.addEventListener('click', function () { window.print(); });

  /* ---------- Init ---------- */
  (async function init() {
    await Promise.all([carregarEmps(), carregarPagamentos(), carregarLancamentos(), carregarJornadas()]);
    populate();
    setTab(state.tab);
  })();
})();
