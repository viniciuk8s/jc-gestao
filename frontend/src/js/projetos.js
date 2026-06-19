/* ============================================================
   projetos.js — Gestão de Projetos (Kanban)
   localStorage, arrastar-e-soltar entre colunas, filtros,
   envolvidos (funcionários + terceiros), progresso e prazo.
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('kanban')) return;

  var KEY = 'jc_projetos';
  var STATUSES = ['planejamento', 'andamento', 'revisao', 'concluido'];
  var PRIO_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

  var JC = window.JC;
  // Helpers compartilhados (ver utils.js)
  var esc = JC.esc, fmtDateBR = JC.fmtDateShort;   // projetos usa data curta (DD/MM)
  var initials = JC.initials, colorFor = JC.color;
  var gv = JC.val, gvSet = JC.setVal;

  var state = {
    projs: load(),
    busca: '',
    setor: 'todos',
    prio: 'todos'
  };

  // seleção temporária enquanto o modal está aberto
  var picked = { funcs: [], terceiros: [] };

  /* ---------- Persistência ---------- */
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state.projs)); } catch (e) {} }
  function seed() {
    var base = [
      { nome: 'Usina solar — Galpão Industrial', cliente: 'Indústria Norte', setor: 'Solar', status: 'andamento', prio: 'alta', entrega: '2026-06-20', progresso: 60, descricao: '', envolvidos: [{ nome: 'Carlos Lima', tipo: 'funcionario' }, { nome: 'Rafael Gomes', tipo: 'funcionario' }, { nome: 'Cooperativa Solar', tipo: 'terceiro' }] },
      { nome: 'Reforma elétrica — Mercado São José', cliente: 'Mercado São José', setor: 'Elétrica', status: 'revisao', prio: 'media', entrega: '2026-06-15', progresso: 85, descricao: '', envolvidos: [{ nome: 'João Pedro', tipo: 'funcionario' }, { nome: 'Maria Souza', tipo: 'funcionario' }] },
      { nome: 'Projeto fotovoltaico — Padaria', cliente: 'Padaria Pão Quente', setor: 'Solar', status: 'planejamento', prio: 'media', entrega: '', progresso: 15, descricao: '', envolvidos: [{ nome: 'Maria Souza', tipo: 'funcionario' }] },
      { nome: 'Quadro de distribuição — Aldeota', cliente: 'Residência Aldeota', setor: 'Elétrica', status: 'concluido', prio: 'baixa', entrega: '2026-06-05', progresso: 100, descricao: '', envolvidos: [{ nome: 'João Pedro', tipo: 'funcionario' }] },
      { nome: 'Proposta comercial — Condomínio', cliente: 'Cond. Vila Verde', setor: 'Comercial', status: 'planejamento', prio: 'alta', entrega: '2026-06-12', progresso: 30, descricao: '', envolvidos: [{ nome: 'Ana Beatriz', tipo: 'funcionario' }] }
    ];
    return base.map(function (p, i) { p.id = 'p' + (Date.now() + i); return p; });
  }

  /* ---------- Funcionários (da base de RH) ---------- */
  function getEmployees() {
    try {
      var raw = localStorage.getItem('jc_funcionarios');
      if (raw) {
        var arr = JSON.parse(raw);
        if (arr && arr.length) return arr.map(function (f) { return f.nome; });
      }
    } catch (e) {}
    return ['Maria Souza', 'Carlos Lima', 'João Pedro', 'Ana Beatriz', 'Rafael Gomes', 'Patrícia Nunes'];
  }

  /* ---------- Helpers ---------- */
  function isOverdue(p) {
    if (!p.entrega || p.status === 'concluido') return false;
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return new Date(p.entrega + 'T00:00:00') < hoje;
  }

  /* ---------- Filtro ---------- */
  function passesFilter(p) {
    var q = state.busca.toLowerCase();
    if (state.setor !== 'todos' && p.setor !== state.setor) return false;
    if (state.prio !== 'todos' && p.prio !== state.prio) return false;
    if (q && (p.nome + ' ' + (p.cliente || '')).toLowerCase().indexOf(q) === -1) return false;
    return true;
  }

  /* ---------- Render ---------- */
  function render() {
    STATUSES.forEach(function (st) {
      var col = document.getElementById('col-' + st);
      var cnt = document.getElementById('cnt-' + st);
      if (!col) return;
      var items = state.projs.filter(function (p) { return p.status === st && passesFilter(p); });
      if (cnt) cnt.textContent = items.length;

      if (items.length === 0) {
        col.innerHTML = '<div class="kb-empty">Sem projetos</div>';
      } else {
        col.innerHTML = items.map(cardHTML).join('');
      }
      bindCards(col);
    });
  }

  function avatarsHTML(envolvidos) {
    if (!envolvidos || !envolvidos.length) return '';
    var max = 4;
    var shown = envolvidos.slice(0, max);
    var rest = envolvidos.length - shown.length;
    var html = shown.map(function (e) {
      if (e.tipo === 'terceiro') {
        return '<span class="pj-av terceiro" title="' + esc(e.nome) + ' (terceiro)">' + esc(initials(e.nome)) + '</span>';
      }
      return '<span class="pj-av" style="background:' + colorFor(e.nome) + '" title="' + esc(e.nome) + '">' + esc(initials(e.nome)) + '</span>';
    }).join('');
    if (rest > 0) html += '<span class="pj-av more" title="mais ' + rest + '">+' + rest + '</span>';
    return '<div class="pj-avatars">' + html + '</div>';
  }

  function dueHTML(p) {
    if (!p.entrega) return '<span class="pj-due none"><i class="bi bi-calendar-x"></i> Sem prazo</span>';
    var over = isOverdue(p);
    var icon = over ? 'bi-exclamation-circle' : 'bi-calendar3';
    var txt = over ? 'Atrasado ' + fmtDateBR(p.entrega) : fmtDateBR(p.entrega);
    return '<span class="pj-due' + (over ? ' over' : '') + '"><i class="bi ' + icon + '"></i> ' + txt + '</span>';
  }

  function cardHTML(p) {
    var prog = Math.max(0, Math.min(100, Number(p.progresso || 0)));
    var done = p.status === 'concluido' ? ' done' : '';
    return '' +
    '<div class="kb-card prio-' + p.prio + done + '" draggable="true" data-id="' + p.id + '">' +
      '<div class="kb-card-head">' +
        '<div class="kb-card-title">' + esc(p.nome) + '</div>' +
        '<div class="kb-card-actions">' +
          '<button class="icon-btn pj-edit" data-id="' + p.id + '" aria-label="Editar"><i class="bi bi-pencil"></i></button>' +
          '<button class="icon-btn danger pj-del" data-id="' + p.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button>' +
        '</div>' +
      '</div>' +
      (p.cliente ? '<div class="kb-card-client"><i class="bi bi-building"></i> ' + esc(p.cliente) + '</div>' : '') +
      '<span class="kb-tag">' + esc(p.setor) + '</span>' +
      '<div class="pj-prog">' +
        '<div class="pj-prog-meta"><span>Progresso</span><span>' + prog + '%</span></div>' +
        '<div class="pj-prog-track"><div class="pj-prog-bar" style="width:' + prog + '%"></div></div>' +
      '</div>' +
      '<div class="kb-card-foot">' +
        dueHTML(p) +
        avatarsHTML(p.envolvidos) +
      '</div>' +
    '</div>';
  }

  function bindCards(scope) {
    scope.querySelectorAll('.pj-edit').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); openEdit(b.dataset.id); });
    });
    scope.querySelectorAll('.pj-del').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); removeProj(b.dataset.id); });
    });
    scope.querySelectorAll('.kb-card').forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function () { card.classList.remove('dragging'); });
    });
  }

  /* ---------- Drag & drop nas colunas ---------- */
  function initDnD() {
    STATUSES.forEach(function (st) {
      var col = document.getElementById('col-' + st);
      if (!col) return;
      col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('drop'); });
      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) col.classList.remove('drop');
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('drop');
        var id = e.dataTransfer.getData('text/plain');
        var p = state.projs.find(function (x) { return x.id === id; });
        if (p && p.status !== st) {
          p.status = st;
          if (st === 'concluido') p.progresso = 100;
          save();
          render();
        }
      });
    });
  }

  /* ---------- CRUD ---------- */
  function removeProj(id) {
    var p = state.projs.find(function (x) { return x.id === id; });
    if (!p) return;
    JC.confirm({ message: 'Excluir o projeto "' + p.nome + '"?', confirmText: 'Excluir', danger: true }).then(function (ok) {
      if (!ok) return;
      state.projs = state.projs.filter(function (x) { return x.id !== id; });
      save(); render();
      JC.toast('Projeto excluído.', 'success');
    });
  }

  function openNew() {
    setTitle('Novo projeto');
    gvSet('pf-id', '');
    ['pf-nome', 'pf-cliente', 'pf-desc'].forEach(function (id) { gvSet(id, ''); });
    gvSet('pf-setor', 'Elétrica');
    gvSet('pf-status', 'planejamento');
    gvSet('pf-prio', 'media');
    gvSet('pf-entrega', '');
    gvSet('pf-prog', 0);
    updateProgLabel();
    picked = { funcs: [], terceiros: [] };
    renderPick(); renderTerceiros();
    clearErr();
    if (window.openModal) window.openModal();
  }

  function openEdit(id) {
    var p = state.projs.find(function (x) { return x.id === id; });
    if (!p) return;
    setTitle('Editar projeto');
    gvSet('pf-id', p.id);
    gvSet('pf-nome', p.nome);
    gvSet('pf-cliente', p.cliente || '');
    gvSet('pf-setor', p.setor);
    gvSet('pf-status', p.status);
    gvSet('pf-prio', p.prio);
    gvSet('pf-entrega', p.entrega || '');
    gvSet('pf-prog', p.progresso || 0);
    gvSet('pf-desc', p.descricao || '');
    updateProgLabel();
    picked = {
      funcs: (p.envolvidos || []).filter(function (e) { return e.tipo === 'funcionario'; }).map(function (e) { return e.nome; }),
      terceiros: (p.envolvidos || []).filter(function (e) { return e.tipo === 'terceiro'; }).map(function (e) { return e.nome; })
    };
    renderPick(); renderTerceiros();
    clearErr();
    if (window.openModal) window.openModal();
  }

  function submitForm(e) {
    if (e) e.preventDefault();
    var nome = gv('pf-nome');
    if (!nome) { setErr('Informe o nome do projeto.'); return; }
    clearErr();

    var envolvidos = picked.funcs.map(function (n) { return { nome: n, tipo: 'funcionario' }; })
      .concat(picked.terceiros.map(function (n) { return { nome: n, tipo: 'terceiro' }; }));

    var dados = {
      nome: nome,
      cliente: gv('pf-cliente'),
      setor: gv('pf-setor'),
      status: gv('pf-status'),
      prio: gv('pf-prio'),
      entrega: gv('pf-entrega'),
      progresso: Number(gv('pf-prog') || 0),
      descricao: gv('pf-desc'),
      envolvidos: envolvidos
    };
    if (dados.status === 'concluido') dados.progresso = 100;

    var id = gv('pf-id');
    if (id) {
      var p = state.projs.find(function (x) { return x.id === id; });
      if (p) Object.assign(p, dados);
    } else {
      dados.id = 'p' + Date.now();
      state.projs.push(dados);
    }
    save(); render();
    JC.toast(id ? 'Projeto atualizado.' : 'Projeto criado.', 'success');
    if (window.closeModal) window.closeModal();
  }

  /* ---------- Modal: seletores de envolvidos ---------- */
  function renderPick() {
    var box = document.getElementById('pf-funcs');
    if (!box) return;
    var emps = getEmployees();
    box.innerHTML = emps.map(function (nome) {
      var on = picked.funcs.indexOf(nome) !== -1;
      return '<button type="button" class="pick' + (on ? ' on' : '') + '" data-nome="' + esc(nome) + '">' +
        '<span class="av" style="background:' + colorFor(nome) + '">' + esc(initials(nome)) + '</span>' +
        esc(nome) + '</button>';
    }).join('');
    box.querySelectorAll('.pick').forEach(function (b) {
      b.addEventListener('click', function () {
        var nome = b.dataset.nome;
        var i = picked.funcs.indexOf(nome);
        if (i === -1) picked.funcs.push(nome); else picked.funcs.splice(i, 1);
        b.classList.toggle('on');
      });
    });
  }

  function renderTerceiros() {
    var box = document.getElementById('pf-terceiros');
    if (!box) return;
    box.innerHTML = picked.terceiros.map(function (nome, idx) {
      return '<span class="chip">' + esc(nome) +
        '<button type="button" data-idx="' + idx + '" aria-label="Remover">&times;</button></span>';
    }).join('');
    box.querySelectorAll('button[data-idx]').forEach(function (b) {
      b.addEventListener('click', function () {
        picked.terceiros.splice(Number(b.dataset.idx), 1);
        renderTerceiros();
      });
    });
  }

  function addTerceiro() {
    var inp = document.getElementById('pf-terc-input');
    if (!inp) return;
    var v = inp.value.trim();
    if (!v) return;
    if (picked.terceiros.indexOf(v) === -1) picked.terceiros.push(v);
    inp.value = '';
    renderTerceiros();
    inp.focus();
  }

  /* ---------- Exportar CSV ---------- */
  function exportCSV() {
    var STAT = { planejamento: 'Planejamento', andamento: 'Em execução', revisao: 'Em revisão', concluido: 'Concluído' };
    var head = ['Projeto', 'Cliente', 'Setor', 'Status', 'Prioridade', 'Entrega', 'Progresso', 'Envolvidos'];
    var lines = [head.join(';')];
    state.projs.filter(passesFilter).forEach(function (p) {
      var env = (p.envolvidos || []).map(function (e) { return e.nome; }).join(', ');
      lines.push([
        '"' + p.nome.replace(/"/g, '""') + '"',
        '"' + (p.cliente || '').replace(/"/g, '""') + '"',
        p.setor, STAT[p.status], PRIO_LABEL[p.prio],
        p.entrega ? fmtDateBR(p.entrega) : 'Sem prazo',
        (p.progresso || 0) + '%',
        '"' + env.replace(/"/g, '""') + '"'
      ].join(';'));
    });
    JC.saveCSV('projetos-' + new Date().toISOString().slice(0, 10) + '.csv', lines);
  }

  /* ---------- Form helpers ---------- */
  function setTitle(t) { var el = document.getElementById('pj-modal-title'); if (el) el.textContent = t; }
  function setErr(m) { var el = document.getElementById('pf-error'); if (el) el.textContent = m; }
  function clearErr() { setErr(''); }
  function updateProgLabel() {
    var el = document.getElementById('pf-prog-val');
    if (el) el.textContent = (gv('pf-prog') || 0) + '%';
  }

  /* ---------- Eventos ---------- */
  document.getElementById('pj-busca')?.addEventListener('input', function (e) { state.busca = e.target.value; render(); });
  document.getElementById('pj-setor')?.addEventListener('change', function (e) { state.setor = e.target.value; render(); });
  document.getElementById('pj-prio')?.addEventListener('change', function (e) { state.prio = e.target.value; render(); });
  document.getElementById('pj-add')?.addEventListener('click', openNew);
  document.getElementById('pj-export')?.addEventListener('click', exportCSV);
  document.getElementById('pj-form')?.addEventListener('submit', submitForm);
  document.getElementById('pf-prog')?.addEventListener('input', updateProgLabel);
  document.getElementById('pf-terc-btn')?.addEventListener('click', addTerceiro);
  document.getElementById('pf-terc-input')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addTerceiro(); }
  });

  /* ---------- Init ---------- */
  initDnD();
  render();
})();