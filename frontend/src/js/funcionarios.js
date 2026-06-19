/* ============================================================
   funcionarios.js — Gestão de Funcionários (RH)
   Estado em localStorage, visões cards/lista, filtros,
   resumo, cadastro/edição/exclusão e exportação CSV.
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('hr-grid')) return; // só na página de funcionários

  var KEY = 'jc_funcionarios';

  var JC = window.JC;
  // Helpers compartilhados (ver utils.js)
  var esc = JC.esc, fmt = JC.brl, fmtDateBR = JC.fmtDate;
  var initials = JC.initials, colorFor = JC.color;
  var gv = JC.val, gvSet = JC.setVal, set = JC.setText;

  var state = {
    funcs: load(),
    view: 'grid',     // 'grid' | 'list'
    busca: '',
    dep: 'todos',
    status: 'todos'
  };

  var STATUS_LABEL = { ativo: 'Ativo', ferias: 'Férias', afastado: 'Afastado', inativo: 'Inativo' };

  /* ---------- Persistência ---------- */
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state.funcs)); } catch (e) {} }
  function seed() {
    var base = [
      { nome: 'Maria Souza',     funcao: 'Engenheira eletricista',   dep: 'Elétrica',       contrato: 'CLT',        admissao: '2023-02-10', salario: 8200, status: 'ativo',    email: 'maria.souza@jcsolar.com',  telefone: '(84) 99999-0001' },
      { nome: 'Carlos Lima',     funcao: 'Técnico em energia solar', dep: 'Solar',          contrato: 'CLT',        admissao: '2024-06-01', salario: 3800, status: 'ativo',    email: 'carlos.lima@jcsolar.com',  telefone: '(84) 99999-0002' },
      { nome: 'João Pedro',      funcao: 'Eletricista',              dep: 'Elétrica',       contrato: 'CLT',        admissao: '2022-09-15', salario: 3200, status: 'ferias',   email: 'joao.pedro@jcsolar.com',   telefone: '(84) 99999-0003' },
      { nome: 'Ana Beatriz',     funcao: 'Vendedora',                dep: 'Comercial',      contrato: 'PJ',         admissao: '2025-01-20', salario: 2800, status: 'ativo',    email: 'ana.beatriz@jcsolar.com',  telefone: '(84) 99999-0004' },
      { nome: 'Rafael Gomes',    funcao: 'Auxiliar técnico',         dep: 'Solar',          contrato: 'Temporário', admissao: '2026-03-05', salario: 1900, status: 'ativo',    email: 'rafael.gomes@jcsolar.com', telefone: '(84) 99999-0005' },
      { nome: 'Patrícia Nunes',  funcao: 'Analista financeiro',      dep: 'Administrativo', contrato: 'CLT',        admissao: '2021-11-02', salario: 4500, status: 'afastado', email: 'patricia.nunes@jcsolar.com', telefone: '(84) 99999-0006' }
    ];
    return base.map(function (f, i) { f.id = 'f' + (Date.now() + i); return f; });
  }

  /* ---------- Filtro ---------- */
  function getFiltered() {
    var q = state.busca.toLowerCase();
    return state.funcs.filter(function (f) {
      if (state.dep !== 'todos' && f.dep !== state.dep) return false;
      if (state.status !== 'todos' && f.status !== state.status) return false;
      if (q && (f.nome + ' ' + f.funcao + ' ' + (f.email || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  }

  /* ---------- Resumo ---------- */
  function renderSummary() {
    var total = state.funcs.length;
    var ativos = state.funcs.filter(function (f) { return f.status === 'ativo'; }).length;
    var afast = state.funcs.filter(function (f) { return f.status === 'ferias' || f.status === 'afastado'; }).length;
    var folha = state.funcs.reduce(function (s, f) {
      return s + (f.status !== 'inativo' && f.salario ? Number(f.salario) : 0);
    }, 0);
    set('hr-total', total);
    set('hr-ativos', ativos);
    set('hr-afast', afast);
    set('hr-folha', fmt(folha));
  }

  /* ---------- Render principal ---------- */
  function render() {
    renderSummary();
    var rows = getFiltered();
    var grid = document.getElementById('hr-grid');
    var listWrap = document.getElementById('hr-list');

    if (state.view === 'grid') {
      grid.hidden = false; listWrap.hidden = true;
      renderGrid(rows);
    } else {
      grid.hidden = true; listWrap.hidden = false;
      renderList(rows);
    }
  }

  function emptyHTML(colspan) {
    var inner = '<div class="ico"><i class="bi bi-people"></i></div>' +
      '<p>Nenhum funcionário encontrado.<br>Cadastre um novo colaborador para começar.</p>';
    return colspan
      ? '<tr><td colspan="' + colspan + '"><div class="hr-empty" style="border:none;padding:40px 20px">' + inner + '</div></td></tr>'
      : '<div class="hr-empty">' + inner + '</div>';
  }

  function renderGrid(rows) {
    var grid = document.getElementById('hr-grid');
    if (rows.length === 0) { grid.innerHTML = emptyHTML(); return; }
    grid.innerHTML = rows.map(function (f) {
      return '' +
      '<div class="hr-card">' +
        '<div class="hr-card-top">' +
          '<div class="hr-avatar" style="background:' + colorFor(f.nome) + '">' + esc(initials(f.nome)) + '</div>' +
          '<div class="hr-id">' +
            '<div class="hr-name">' + esc(f.nome) + '</div>' +
            '<div class="hr-role">' + esc(f.funcao) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hr-badges">' +
          '<span class="hr-tag">' + esc(f.dep) + '</span>' +
          '<span class="hr-tag">' + esc(f.contrato) + '</span>' +
          '<span class="st ' + f.status + '">' + STATUS_LABEL[f.status] + '</span>' +
        '</div>' +
        '<div class="hr-meta">' +
          '<div class="hr-meta-item"><i class="bi bi-envelope"></i><span>' + esc(f.email || '—') + '</span></div>' +
          '<div class="hr-meta-item"><i class="bi bi-telephone"></i><span>' + esc(f.telefone || '—') + '</span></div>' +
          '<div class="hr-meta-item"><i class="bi bi-calendar3"></i><span>Admissão ' + fmtDateBR(f.admissao) + '</span></div>' +
        '</div>' +
        '<div class="hr-card-foot">' +
          '<div class="hr-salary-wrap"><span class="cap">Salário</span><span class="hr-salary">' + fmt(Number(f.salario || 0)) + '</span></div>' +
          '<div class="hr-card-actions">' +
            '<button class="icon-btn hr-edit" data-id="' + f.id + '" aria-label="Editar"><i class="bi bi-pencil"></i></button>' +
            '<button class="icon-btn danger hr-del" data-id="' + f.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    bindRowActions(grid);
  }

  function renderList(rows) {
    var tbody = document.getElementById('hr-tbody');
    if (rows.length === 0) { tbody.innerHTML = emptyHTML(8); return; }
    tbody.innerHTML = rows.map(function (f) {
      return '' +
      '<tr>' +
        '<td><div class="hr-cell-name">' +
          '<div class="hr-avatar" style="background:' + colorFor(f.nome) + '">' + esc(initials(f.nome)) + '</div>' +
          '<div><div class="n">' + esc(f.nome) + '</div><div class="e">' + esc(f.email || '') + '</div></div>' +
        '</div></td>' +
        '<td>' + esc(f.funcao) + '</td>' +
        '<td><span class="hr-tag">' + esc(f.dep) + '</span></td>' +
        '<td>' + esc(f.contrato) + '</td>' +
        '<td>' + fmtDateBR(f.admissao) + '</td>' +
        '<td class="num">' + fmt(Number(f.salario || 0)) + '</td>' +
        '<td><span class="st ' + f.status + '">' + STATUS_LABEL[f.status] + '</span></td>' +
        '<td><div class="hr-card-actions">' +
          '<button class="icon-btn hr-edit" data-id="' + f.id + '" aria-label="Editar"><i class="bi bi-pencil"></i></button>' +
          '<button class="icon-btn danger hr-del" data-id="' + f.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
    bindRowActions(tbody);
  }

  function bindRowActions(scope) {
    scope.querySelectorAll('.hr-edit').forEach(function (b) {
      b.addEventListener('click', function () { openEdit(b.dataset.id); });
    });
    scope.querySelectorAll('.hr-del').forEach(function (b) {
      b.addEventListener('click', function () { removeFunc(b.dataset.id); });
    });
  }

  /* ---------- CRUD ---------- */
  function removeFunc(id) {
    var f = state.funcs.find(function (x) { return x.id === id; });
    if (!f) return;
    JC.confirm({ message: 'Excluir ' + f.nome + '?', confirmText: 'Excluir', danger: true }).then(function (ok) {
      if (!ok) return;
      state.funcs = state.funcs.filter(function (x) { return x.id !== id; });
      save(); render();
      JC.toast('Funcionário excluído.', 'success');
    });
  }

  function openNew() {
    setTitle('Novo funcionário');
    gvSet('hf-id', '');
    ['hf-nome', 'hf-funcao', 'hf-salario', 'hf-email', 'hf-telefone'].forEach(function (id) { gvSet(id, ''); });
    gvSet('hf-dep', 'Elétrica');
    gvSet('hf-contrato', 'CLT');
    gvSet('hf-status', 'ativo');
    gvSet('hf-admissao', new Date().toISOString().slice(0, 10));
    clearErr();
    if (window.openModal) window.openModal();
  }

  function openEdit(id) {
    var f = state.funcs.find(function (x) { return x.id === id; });
    if (!f) return;
    setTitle('Editar funcionário');
    gvSet('hf-id', f.id);
    gvSet('hf-nome', f.nome);
    gvSet('hf-funcao', f.funcao);
    gvSet('hf-dep', f.dep);
    gvSet('hf-contrato', f.contrato);
    gvSet('hf-status', f.status);
    gvSet('hf-salario', f.salario);
    gvSet('hf-admissao', f.admissao);
    gvSet('hf-email', f.email || '');
    gvSet('hf-telefone', f.telefone || '');
    clearErr();
    if (window.openModal) window.openModal();
  }

  function submitForm(e) {
    if (e) e.preventDefault();
    var nome = gv('hf-nome');
    var salario = parseFloat(gv('hf-salario'));
    if (!nome) { setErr('Informe o nome do funcionário.'); return; }
    if (gv('hf-salario') !== '' && (isNaN(salario) || salario < 0)) { setErr('Salário inválido.'); return; }
    clearErr();

    var dados = {
      nome: nome,
      funcao: gv('hf-funcao') || 'Não informado',
      dep: gv('hf-dep'),
      contrato: gv('hf-contrato'),
      status: gv('hf-status'),
      salario: isNaN(salario) ? 0 : salario,
      admissao: gv('hf-admissao'),
      email: gv('hf-email'),
      telefone: gv('hf-telefone')
    };

    var id = gv('hf-id');
    if (id) {
      var f = state.funcs.find(function (x) { return x.id === id; });
      if (f) Object.assign(f, dados);
    } else {
      dados.id = 'f' + Date.now();
      state.funcs.push(dados);
    }
    save(); render();
    JC.toast(id ? 'Funcionário atualizado.' : 'Funcionário cadastrado.', 'success');
    if (window.closeModal) window.closeModal();
  }

  /* ---------- Exportar CSV ---------- */
  function exportCSV() {
    var rows = getFiltered();
    var head = ['Nome', 'Função', 'Setor', 'Contrato', 'Admissão', 'Salário', 'Status', 'Email', 'Telefone'];
    var lines = [head.join(';')];
    rows.forEach(function (f) {
      lines.push([
        '"' + f.nome.replace(/"/g, '""') + '"',
        '"' + f.funcao.replace(/"/g, '""') + '"',
        f.dep, f.contrato, fmtDateBR(f.admissao),
        Number(f.salario || 0).toFixed(2).replace('.', ','),
        STATUS_LABEL[f.status], f.email || '', f.telefone || ''
      ].join(';'));
    });
    JC.saveCSV('funcionarios-' + new Date().toISOString().slice(0, 10) + '.csv', lines);
  }

  /* ---------- Form helpers ---------- */
  function setTitle(t) { var el = document.getElementById('hr-modal-title'); if (el) el.textContent = t; }
  function setErr(m) { var el = document.getElementById('hr-form-error'); if (el) el.textContent = m; }
  function clearErr() { setErr(''); }

  /* ---------- Eventos ---------- */
  var busca = document.getElementById('hr-busca');
  if (busca) busca.addEventListener('input', function () { state.busca = busca.value; render(); });

  var dep = document.getElementById('hr-dep');
  if (dep) dep.addEventListener('change', function () { state.dep = dep.value; render(); });

  var stat = document.getElementById('hr-status');
  if (stat) stat.addEventListener('change', function () { state.status = stat.value; render(); });

  var view = document.getElementById('hr-view');
  if (view) {
    view.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-view]');
      if (!btn) return;
      state.view = btn.dataset.view;
      view.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      render();
    });
  }

  var addBtn = document.getElementById('hr-add');
  if (addBtn) addBtn.addEventListener('click', openNew);

  var exp = document.getElementById('hr-export');
  if (exp) exp.addEventListener('click', exportCSV);

  var form = document.getElementById('hr-form');
  if (form) form.addEventListener('submit', submitForm);

  /* ---------- Init ---------- */
  render();
})();