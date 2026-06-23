/* ============================================================
   funcionarios.js — Gestão de Funcionários (RH)
   100% conectado ao back-end (JC.api.funcionarios). Visões
   cards/lista, filtros, resumo, cadastro/edição/exclusão
   (modal dinâmico JC.modal) e exportação CSV.

   Contrato do back-end (GET /api/funcionarios):
     { id:int, nome, funcao, setor, contrato, admissao('AAAA-MM-DD'|null),
       salario:number|null, status, email, telefone, createdAt }
   Enums: setor = Elétrica|Solar|Administrativo|Comercial ·
          contrato = CLT|PJ|Temporário · status = ativo|ferias|afastado|inativo
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('hr-grid')) return; // só na página de funcionários

  var JC = window.JC;
  var esc = JC.esc, fmt = JC.brl, fmtDateBR = JC.fmtDate;
  var initials = JC.initials, colorFor = JC.color;
  var set = JC.setText;

  var state = {
    funcs: [],
    view: 'grid',     // 'grid' | 'list'
    busca: '',
    dep: 'todos',     // filtra por setor
    status: 'todos',
    carregando: true
  };

  var STATUS_LABEL = { ativo: 'Ativo', ferias: 'Férias', afastado: 'Afastado', inativo: 'Inativo' };
  var FUNCOES = ['Eletricista', 'Técnico em energia solar', 'Engenheiro eletricista', 'Auxiliar técnico', 'Gerente de obras', 'Vendedor', 'Administrativo', 'Financeiro'];

  function recurso() { return JC.api.funcionarios; }

  /* ---------- Carregamento (API) ---------- */
  async function carregar() {
    state.carregando = true;
    render();
    try {
      var lista = await recurso().list(); // todos; filtros são no cliente
      state.funcs = (lista || []).map(function (f) {
        f.salario = f.salario == null ? 0 : Number(f.salario);
        return f;
      });
    } catch (e) {
      console.error('Falha ao carregar funcionários:', e);
      JC.toast('Não foi possível carregar os funcionários.', 'error');
      state.funcs = [];
    }
    state.carregando = false;
    render();
  }

  /* ---------- Filtro ---------- */
  function getFiltered() {
    var q = state.busca.toLowerCase();
    return state.funcs.filter(function (f) {
      if (state.dep !== 'todos' && f.setor !== state.dep) return false;
      if (state.status !== 'todos' && f.status !== state.status) return false;
      if (q && ((f.nome || '') + ' ' + (f.funcao || '') + ' ' + (f.email || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || '', 'pt-BR'); });
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

  /* ---------- Avatar (foto do banco ou iniciais coloridas) ---------- */
  function avatarHTML(f, cls) {
    if (f.foto) {
      return '<div class="' + cls + ' has-photo" style="background-image:url(\'' + f.foto + '\');background-size:cover;background-position:center"></div>';
    }
    return '<div class="' + cls + '" style="background:' + colorFor(f.nome) + '">' + esc(initials(f.nome)) + '</div>';
  }

  /* ---------- Render principal ---------- */
  function render() {
    var grid = document.getElementById('hr-grid');
    var listWrap = document.getElementById('hr-list');

    if (state.carregando) {
      renderSummary();
      if (state.view === 'grid') { grid.hidden = false; listWrap.hidden = true; grid.innerHTML = '<div class="hr-empty" style="border:none"><p>Carregando…</p></div>'; }
      else { grid.hidden = true; listWrap.hidden = false; var tb = document.getElementById('hr-tbody'); if (tb) tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px">Carregando…</td></tr>'; }
      return;
    }

    renderSummary();
    var rows = getFiltered();
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
          avatarHTML(f, 'hr-avatar') +
          '<div class="hr-id">' +
            '<div class="hr-name">' + esc(f.nome) + '</div>' +
            '<div class="hr-role">' + esc(f.funcao || '—') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hr-badges">' +
          '<span class="hr-tag">' + esc(f.setor || '—') + '</span>' +
          '<span class="hr-tag">' + esc(f.contrato || '—') + '</span>' +
          '<span class="st ' + f.status + '">' + (STATUS_LABEL[f.status] || f.status) + '</span>' +
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
  }

  function renderList(rows) {
    var tbody = document.getElementById('hr-tbody');
    if (rows.length === 0) { tbody.innerHTML = emptyHTML(8); return; }
    tbody.innerHTML = rows.map(function (f) {
      return '' +
      '<tr>' +
        '<td data-label="Funcionário"><div class="hr-cell-name">' +
          avatarHTML(f, 'hr-avatar') +
          '<div><div class="n">' + esc(f.nome) + '</div><div class="e">' + esc(f.email || '') + '</div></div>' +
        '</div></td>' +
        '<td data-label="Função">' + esc(f.funcao || '—') + '</td>' +
        '<td data-label="Setor"><span class="hr-tag">' + esc(f.setor || '—') + '</span></td>' +
        '<td data-label="Contrato">' + esc(f.contrato || '—') + '</td>' +
        '<td data-label="Admissão">' + fmtDateBR(f.admissao) + '</td>' +
        '<td class="num" data-label="Salário">' + fmt(Number(f.salario || 0)) + '</td>' +
        '<td data-label="Status"><span class="st ' + f.status + '">' + (STATUS_LABEL[f.status] || f.status) + '</span></td>' +
        '<td class="col-act"><div class="hr-card-actions">' +
          '<button class="icon-btn hr-edit" data-id="' + f.id + '" aria-label="Editar"><i class="bi bi-pencil"></i></button>' +
          '<button class="icon-btn danger hr-del" data-id="' + f.id + '" aria-label="Excluir"><i class="bi bi-trash3"></i></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  // Delegação: um listener por contêiner (não re-liga a cada render)
  function onContainerClick(e) {
    var ed = e.target.closest('.hr-edit');
    if (ed) { var f = state.funcs.find(function (x) { return String(x.id) === ed.dataset.id; }); if (f) openForm(f); return; }
    var dl = e.target.closest('.hr-del');
    if (dl) { removeFunc(dl.dataset.id); }
  }

  /* ---------- Excluir (API) ---------- */
  function removeFunc(id) {
    var f = state.funcs.find(function (x) { return String(x.id) === String(id); });
    if (!f) return;
    JC.confirm({ message: 'Excluir ' + f.nome + '?', confirmText: 'Excluir', danger: true }).then(async function (ok) {
      if (!ok) return;
      try {
        await recurso().remove(id);
        JC.toast('Funcionário excluído.', 'success');
        await carregar();
      } catch (e) {
        console.error(e);
        JC.toast(e && e.message ? e.message : 'Erro ao excluir.', 'error');
      }
    });
  }

  /* ---------- Cadastro / edição (modal dinâmico) ---------- */
  function openForm(f) {
    f = f || {};
    var editId = f.id || '';
    var hoje = new Date().toISOString().slice(0, 10);

    JC.modal.open({
      title: editId ? 'Editar funcionário' : 'Novo funcionário',
      subtitle: 'Dados profissionais do colaborador',
      submitText: editId ? 'Salvar alterações' : 'Cadastrar funcionário',
      maxWidth: '560px',
      fields: [
        { type: 'section', label: 'Dados pessoais' },
        { id: 'foto', type: 'avatar', label: 'Foto do funcionário', value: f.foto || '' },
        { id: 'nome', label: 'Nome completo', type: 'text', required: true, value: f.nome || '', placeholder: 'Ex: Maria Souza' },
        { id: 'cpf', label: 'CPF', type: 'text', half: true, value: f.cpf || '', placeholder: '000.000.000-00', inputmode: 'numeric' },
        { id: 'nascimento', label: 'Nascimento', type: 'date', half: true, value: f.nascimento || '' },
        { id: 'telefone', label: 'Telefone', type: 'tel', half: true, value: f.telefone || '', placeholder: '(00) 00000-0000', inputmode: 'tel' },
        { id: 'email', label: 'E-mail', type: 'email', half: true, value: f.email || '', placeholder: 'nome@empresa.com' },
        { id: 'endereco', label: 'Endereço', type: 'text', value: f.endereco || '', placeholder: 'Rua, nº, bairro — cidade' },

        { type: 'section', label: 'Dados profissionais' },
        { id: 'funcao', label: 'Função / Cargo', type: 'text', value: f.funcao || '', placeholder: 'Ex: Eletricista', list: FUNCOES },
        { id: 'setor', label: 'Setor', type: 'select', half: true, value: f.setor || 'Elétrica', options: ['Elétrica', 'Solar', 'Administrativo', 'Comercial'] },
        { id: 'contrato', label: 'Contrato', type: 'select', half: true, value: f.contrato || 'CLT', options: ['CLT', 'PJ', 'Temporário'] },
        { id: 'status', label: 'Status', type: 'select', half: true, value: f.status || 'ativo',
          options: [{ value: 'ativo', label: 'Ativo' }, { value: 'ferias', label: 'Férias' }, { value: 'afastado', label: 'Afastado' }, { value: 'inativo', label: 'Inativo' }] },
        { id: 'admissao', label: 'Admissão', type: 'date', half: true, value: f.admissao || hoje },
        { id: 'salario', label: 'Salário (R$)', type: 'number', step: '0.01', min: '0', inputmode: 'decimal', value: f.salario != null && f.salario !== 0 ? f.salario : '', placeholder: '0,00' }
      ],
      onReady: function (ctrl) {
        var cpf = ctrl.input('cpf'), tel = ctrl.input('telefone');
        function dig(v) { return String(v || '').replace(/\D/g, ''); }
        if (cpf) cpf.addEventListener('input', function () {
          var d = dig(cpf.value).slice(0, 11), out = d;
          if (d.length > 9) out = d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
          else if (d.length > 6) out = d.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
          else if (d.length > 3) out = d.replace(/(\d{3})(\d{1,3})/, '$1.$2');
          cpf.value = out;
        });
        if (tel) tel.addEventListener('input', function () {
          var d = dig(tel.value).slice(0, 11), out = d;
          if (d.length > 10) out = d.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
          else if (d.length > 6) out = d.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
          else if (d.length > 2) out = d.replace(/(\d{2})(\d{1,5})/, '($1) $2');
          else if (d.length > 0) out = d.replace(/(\d{1,2})/, '($1');
          tel.value = out;
        });
      },
      onSubmit: async function (vals) {
        var nome = String(vals.nome || '').trim();
        if (!nome) throw new Error('Informe o nome do funcionário.');
        var salStr = String(vals.salario == null ? '' : vals.salario).trim().replace(',', '.');
        var salario = parseFloat(salStr);
        if (salStr !== '' && (isNaN(salario) || salario < 0)) throw new Error('Salário inválido.');

        var body = {
          nome: nome,
          funcao: String(vals.funcao || '').trim() || null,
          setor: vals.setor,
          contrato: vals.contrato,
          status: vals.status,
          admissao: vals.admissao || null,
          email: String(vals.email || '').trim(),
          telefone: String(vals.telefone || '').trim() || null,
          foto: vals.foto || null,
          cpf: String(vals.cpf || '').trim() || null,
          nascimento: vals.nascimento || null,
          endereco: String(vals.endereco || '').trim() || null
        };
        if (salStr !== '') body.salario = salario;

        if (editId) await recurso().update(editId, body);
        else await recurso().create(body);
        JC.toast(editId ? 'Funcionário atualizado.' : 'Funcionário cadastrado.', 'success');
        await carregar();
      }
    });
  }

  /* ---------- Exportar CSV ---------- */
  function exportCSV() {
    var rows = getFiltered();
    var head = ['Nome', 'Função', 'Setor', 'Contrato', 'Admissão', 'Salário', 'Status', 'Email', 'Telefone', 'CPF', 'Nascimento', 'Endereço'];
    var lines = [head.join(';')];
    rows.forEach(function (f) {
      lines.push([
        JC.csvCell(f.nome), JC.csvCell(f.funcao || ''),
        f.setor || '', f.contrato || '', fmtDateBR(f.admissao),
        Number(f.salario || 0).toFixed(2).replace('.', ','),
        STATUS_LABEL[f.status] || f.status, f.email || '', f.telefone || '',
        f.cpf || '', f.nascimento ? fmtDateBR(f.nascimento) : '', JC.csvCell(f.endereco || '')
      ].join(';'));
    });
    JC.saveCSV('funcionarios-' + new Date().toISOString().slice(0, 10) + '.csv', lines);
  }

  /* ---------- Eventos ---------- */
  var busca = document.getElementById('hr-busca');
  if (busca) busca.addEventListener('input', JC.debounce(function () { state.busca = busca.value; render(); }, 200));

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
  if (addBtn) addBtn.addEventListener('click', function () { openForm(); });

  var exp = document.getElementById('hr-export');
  if (exp) exp.addEventListener('click', exportCSV);

  // Delegação de cliques nas ações de linha/card
  document.getElementById('hr-grid').addEventListener('click', onContainerClick);
  var tbody = document.getElementById('hr-tbody');
  if (tbody) tbody.addEventListener('click', onContainerClick);

  /* ---------- Init ---------- */
  carregar();
})();
