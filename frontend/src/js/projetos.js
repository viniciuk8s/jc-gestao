/* ============================================================
   projetos.js — Gestão de Projetos (Kanban)
   100% conectado ao back-end (JC.api.projetos). Arrastar-e-soltar
   entre colunas (persiste via PUT), filtros, envolvidos
   (funcionários da API + terceiros), progresso e prazo.

   Contrato (GET /api/projetos):
     { id:int, nome, cliente, setor, status, prioridade, entrega('AAAA-MM-DD'|null),
       progresso:int, descricao, createdAt, membros:[{id,nome,tipo}] }
   Envio (POST/PUT): { nome, cliente, setor, status, prioridade, entrega,
                       progresso, descricao, membros:[{nome,tipo}] }
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('kanban')) return;

  var STATUSES = ['planejamento', 'andamento', 'revisao', 'concluido'];
  var STATUS_LABEL = { planejamento: 'Planejamento', andamento: 'Em execução', revisao: 'Em revisão', concluido: 'Concluído' };
  var PRIO_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

  var JC = window.JC;
  var esc = JC.esc, fmtDateBR = JC.fmtDateShort;   // data curta (DD/MM)
  var initials = JC.initials, colorFor = JC.color;

  var state = {
    projs: [],
    emps: [],          // nomes de funcionários (da API) p/ os chips de envolvidos
    busca: '',
    setor: 'todos',
    prio: 'todos',
    carregando: true
  };

  function recurso() { return JC.api.projetos; }

  /* ---------- Carregamento (API) ---------- */
  async function carregar() {
    state.carregando = true;
    render();
    try {
      var lista = await recurso().list();
      state.projs = (lista || []).map(function (p) {
        p.progresso = Number(p.progresso) || 0;
        p.membros = p.membros || [];
        return p;
      });
    } catch (e) {
      console.error('Falha ao carregar projetos:', e);
      JC.toast('Não foi possível carregar os projetos.', 'error');
      state.projs = [];
    }
    state.carregando = false;
    render();
  }

  // Funcionários cadastrados (para o seletor de envolvidos) — direto da API
  async function carregarFuncionarios() {
    try {
      var lista = await JC.api.funcionarios.list();
      state.emps = (lista || []).map(function (f) { return f.nome; });
    } catch (e) {
      state.emps = []; // sem funcionários cadastrados ainda
    }
  }

  /* ---------- Helpers ---------- */
  function isOverdue(p) {
    if (!p.entrega || p.status === 'concluido') return false;
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return new Date(p.entrega + 'T00:00:00') < hoje;
  }

  function passesFilter(p) {
    var q = state.busca.toLowerCase();
    if (state.setor !== 'todos' && p.setor !== state.setor) return false;
    if (state.prio !== 'todos' && p.prioridade !== state.prio) return false;
    if (q && ((p.nome || '') + ' ' + (p.cliente || '')).toLowerCase().indexOf(q) === -1) return false;
    return true;
  }

  /* ---------- Render ---------- */
  function render() {
    STATUSES.forEach(function (st) {
      var col = document.getElementById('col-' + st);
      var cnt = document.getElementById('cnt-' + st);
      if (!col) return;
      if (state.carregando) { col.innerHTML = '<div class="kb-empty">Carregando…</div>'; if (cnt) cnt.textContent = '0'; return; }
      var items = state.projs.filter(function (p) { return p.status === st && passesFilter(p); });
      if (cnt) cnt.textContent = items.length;
      col.innerHTML = items.length === 0 ? '<div class="kb-empty">Sem projetos</div>' : items.map(cardHTML).join('');
    });
  }

  function avatarsHTML(membros) {
    if (!membros || !membros.length) return '';
    var max = 4;
    var shown = membros.slice(0, max);
    var rest = membros.length - shown.length;
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
    '<div class="kb-card prio-' + p.prioridade + done + '" draggable="true" data-id="' + p.id + '">' +
      '<div class="kb-card-head">' +
        '<div class="kb-card-title">' + esc(p.nome) + '</div>' +
        '<div class="kb-card-actions">' +
          '<button class="icon-btn pj-edit" data-id="' + p.id + '" aria-label="Editar"><i class="bi bi-pencil"></i></button>' +
          '<button class="icon-btn danger pj-del" data-id="' + p.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button>' +
        '</div>' +
      '</div>' +
      (p.cliente ? '<div class="kb-card-client"><i class="bi bi-building"></i> ' + esc(p.cliente) + '</div>' : '') +
      '<span class="kb-tag">' + esc(p.setor || '—') + '</span>' +
      '<div class="pj-prog">' +
        '<div class="pj-prog-meta"><span>Progresso</span><span>' + prog + '%</span></div>' +
        '<div class="pj-prog-track"><div class="pj-prog-bar" style="width:' + prog + '%"></div></div>' +
      '</div>' +
      '<div class="kb-card-foot">' +
        dueHTML(p) +
        avatarsHTML(p.membros) +
      '</div>' +
    '</div>';
  }

  /* ---------- Delegação de eventos do quadro (1 listener por coluna) ---------- */
  function bindColumn(col) {
    col.addEventListener('click', function (e) {
      var ed = e.target.closest('.pj-edit');
      if (ed) { e.stopPropagation(); var p = state.projs.find(function (x) { return String(x.id) === ed.dataset.id; }); if (p) openForm(p); return; }
      var dl = e.target.closest('.pj-del');
      if (dl) { e.stopPropagation(); removeProj(dl.dataset.id); }
    });
    col.addEventListener('dragstart', function (e) {
      var card = e.target.closest('.kb-card'); if (!card) return;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    col.addEventListener('dragend', function (e) {
      var card = e.target.closest('.kb-card'); if (card) card.classList.remove('dragging');
    });
  }

  /* ---------- Drag & drop entre colunas (persiste via PUT) ---------- */
  function initDnD() {
    STATUSES.forEach(function (st) {
      var col = document.getElementById('col-' + st);
      if (!col) return;
      bindColumn(col);
      col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('drop'); });
      col.addEventListener('dragleave', function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove('drop'); });
      col.addEventListener('drop', async function (e) {
        e.preventDefault();
        col.classList.remove('drop');
        var id = e.dataTransfer.getData('text/plain');
        var p = state.projs.find(function (x) { return String(x.id) === id; });
        if (!p || p.status === st) return;
        var antesStatus = p.status, antesProg = p.progresso;
        // otimista: atualiza UI já; reverte se a API falhar
        p.status = st;
        if (st === 'concluido') p.progresso = 100;
        render();
        try {
          var body = { status: st };
          if (st === 'concluido') body.progresso = 100;
          await recurso().update(id, body);
        } catch (err) {
          console.error(err);
          p.status = antesStatus; p.progresso = antesProg; render();
          JC.toast(err && err.message ? err.message : 'Não foi possível mover o projeto.', 'error');
        }
      });
    });
  }

  /* ---------- Excluir (API) ---------- */
  function removeProj(id) {
    var p = state.projs.find(function (x) { return String(x.id) === String(id); });
    if (!p) return;
    JC.confirm({ message: 'Excluir o projeto "' + p.nome + '"?', confirmText: 'Excluir', danger: true }).then(async function (ok) {
      if (!ok) return;
      try {
        await recurso().remove(id);
        JC.toast('Projeto excluído.', 'success');
        await carregar();
      } catch (e) {
        console.error(e);
        JC.toast(e && e.message ? e.message : 'Erro ao excluir.', 'error');
      }
    });
  }

  /* ---------- Cadastro / edição (modal dinâmico) ---------- */
  function openForm(p) {
    p = p || {};
    var editId = p.id || '';
    var emps = state.emps;
    var membros = p.membros || [];
    var funcSel = membros.filter(function (e) { return e.tipo === 'funcionario'; }).map(function (e) { return e.nome; });
    var tercSel = membros.filter(function (e) { return e.tipo === 'terceiro'; }).map(function (e) { return e.nome; });

    JC.modal.open({
      title: editId ? 'Editar projeto' : 'Novo projeto',
      subtitle: 'Defina os dados, o prazo e quem está envolvido',
      submitText: editId ? 'Salvar alterações' : 'Criar projeto',
      maxWidth: '600px',
      fields: [
        { type: 'section', label: 'Projeto' },
        { id: 'nome', label: 'Nome do projeto', type: 'text', required: true, value: p.nome || '', placeholder: 'Ex: Usina solar — Galpão Industrial' },
        { id: 'cliente', label: 'Cliente', type: 'text', half: true, value: p.cliente || '', placeholder: 'Ex: Indústria Norte' },
        { id: 'setor', label: 'Setor', type: 'select', half: true, value: p.setor || 'Elétrica', options: ['Elétrica', 'Solar', 'Administrativo', 'Comercial'] },
        { id: 'status', label: 'Status', type: 'select', half: true, value: p.status || 'planejamento',
          options: [{ value: 'planejamento', label: 'Planejamento' }, { value: 'andamento', label: 'Em execução' }, { value: 'revisao', label: 'Em revisão' }, { value: 'concluido', label: 'Concluído' }] },
        { id: 'prioridade', label: 'Prioridade', type: 'select', half: true, value: p.prioridade || 'media',
          options: [{ value: 'baixa', label: 'Baixa' }, { value: 'media', label: 'Média' }, { value: 'alta', label: 'Alta' }] },
        { id: 'entrega', label: 'Data de entrega', type: 'date', half: true, value: p.entrega || '', hint: 'Em branco = sem prazo.' },
        { id: 'progresso', label: 'Progresso', type: 'range', min: 0, max: 100, step: 5, suffix: '%', value: p.progresso != null ? p.progresso : 0 },

        { type: 'section', label: 'Envolvidos' },
        { id: 'funcs', label: 'Funcionários', type: 'chips', value: funcSel,
          options: emps.map(function (n) { return { value: n, label: n, avatar: { color: colorFor(n), initials: initials(n) } }; }),
          hint: emps.length ? 'Toque para incluir/remover.' : 'Cadastre funcionários para escolher aqui.' },
        { id: 'terceiros', label: 'Terceiros / parceiros', type: 'tags', value: tercSel, placeholder: 'Nome do terceiro / empresa parceira', addText: 'Adicionar' },

        { type: 'section', label: 'Descrição' },
        { id: 'descricao', label: 'Descrição', type: 'textarea', rows: 3, value: p.descricao || '', placeholder: 'Escopo, observações...' }
      ],
      onSubmit: async function (vals) {
        var nome = String(vals.nome || '').trim();
        if (!nome) throw new Error('Informe o nome do projeto.');

        var membrosOut = (vals.funcs || []).map(function (n) { return { nome: n, tipo: 'funcionario' }; })
          .concat((vals.terceiros || []).map(function (n) { return { nome: n, tipo: 'terceiro' }; }));

        var prog = Number(vals.progresso || 0);
        var body = {
          nome: nome,
          cliente: String(vals.cliente || '').trim() || null,
          setor: vals.setor,
          status: vals.status,
          prioridade: vals.prioridade,
          entrega: vals.entrega || null,
          progresso: vals.status === 'concluido' ? 100 : prog,
          descricao: String(vals.descricao || '').trim() || null,
          membros: membrosOut
        };

        if (editId) await recurso().update(editId, body);
        else await recurso().create(body);
        JC.toast(editId ? 'Projeto atualizado.' : 'Projeto criado.', 'success');
        await carregar();
      }
    });
  }

  /* ---------- Exportar CSV ---------- */
  function exportCSV() {
    var head = ['Projeto', 'Cliente', 'Setor', 'Status', 'Prioridade', 'Entrega', 'Progresso', 'Envolvidos'];
    var lines = [head.join(';')];
    state.projs.filter(passesFilter).forEach(function (p) {
      var env = (p.membros || []).map(function (e) { return e.nome; }).join(', ');
      lines.push([
        JC.csvCell(p.nome), JC.csvCell(p.cliente || ''),
        p.setor || '', STATUS_LABEL[p.status] || p.status, PRIO_LABEL[p.prioridade] || p.prioridade,
        p.entrega ? fmtDateBR(p.entrega) : 'Sem prazo',
        (p.progresso || 0) + '%',
        JC.csvCell(env)
      ].join(';'));
    });
    JC.saveCSV('projetos-' + new Date().toISOString().slice(0, 10) + '.csv', lines);
  }

  /* ---------- Eventos ---------- */
  document.getElementById('pj-busca')?.addEventListener('input', JC.debounce(function (e) { state.busca = e.target.value; render(); }, 200));
  document.getElementById('pj-setor')?.addEventListener('change', function (e) { state.setor = e.target.value; render(); });
  document.getElementById('pj-prio')?.addEventListener('change', function (e) { state.prio = e.target.value; render(); });
  document.getElementById('pj-add')?.addEventListener('click', function () { openForm(); });
  document.getElementById('pj-export')?.addEventListener('click', exportCSV);

  /* ---------- Init ---------- */
  initDnD();
  carregarFuncionarios();
  carregar();
})();
