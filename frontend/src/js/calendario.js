/* ============================================================
   calendario.js — Agenda
   Calendário, tabela de serviços e modal de agendamento.
   Dados via API (JC.api.agendamentos). Cada serviço pode ter
   colaboradores (funcionários cadastrados) — JC.api.agendamentos
   já devolve/aceita "membros". Clicar num serviço da tabela abre
   o modal em modo edição (UPDATE); clicar num dia cria um novo.
   ============================================================ */
'use strict';

(function () {
  if (!document.getElementById('days-grid')) return;

  var JC = window.JC;
  var escHtml = JC.esc;
  var colorFor = JC.color;
  var initials = JC.initials;

  /* ---------- Estado global ---------- */
  const state = {
    today: new Date(),
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    events: {},          // { "AAAA-MM-DD": [ {id, servico, cliente, horario, valor, status, obs, membros} ] }
    emps: [],            // nomes de funcionários (API) para o seletor de colaboradores
  };

  /* ---------- Helpers de data ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function dateKey(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}`; }
  function todayKey() { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; }
  function monthName(month, year) {
    return new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                       'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const STATUS_MAP = {
    confirmado: { label: 'Confirmado', cls: 'confirmado' },
    pendente:   { label: 'Pendente',   cls: 'pendente' },
    concluido:  { label: 'Concluído',  cls: 'concluido' },
    cancelado:  { label: 'Cancelado',  cls: 'cancelado' },
  };

  /* ---------- Seletores de mês/ano ---------- */
  function populateSelectors() {
    const selM = document.getElementById('sel-month');
    const selY = document.getElementById('sel-year');
    if (selM && !selM.options.length) {
      MONTHS_FULL.forEach((nome, i) => {
        const o = document.createElement('option');
        o.value = i; o.textContent = nome;
        selM.appendChild(o);
      });
    }
    if (selY && !selY.options.length) {
      const base = state.today.getFullYear();
      for (let y = base - 5; y <= base + 5; y++) {
        const o = document.createElement('option');
        o.value = y; o.textContent = y;
        selY.appendChild(o);
      }
    }
  }

  function syncSelectors() {
    const selM = document.getElementById('sel-month');
    const selY = document.getElementById('sel-year');
    if (selM) selM.value = state.currentMonth;
    if (selY) {
      if (!Array.from(selY.options).some((o) => Number(o.value) === state.currentYear)) {
        const o = document.createElement('option');
        o.value = state.currentYear; o.textContent = state.currentYear;
        selY.appendChild(o);
        Array.from(selY.options).sort((a, b) => a.value - b.value)
          .forEach((opt) => selY.appendChild(opt));
      }
      selY.value = state.currentYear;
    }
  }

  /* ---------- Carregamento (API) ---------- */
  async function carregar() {
    try {
      const lista = await JC.api.agendamentos.list(); // todos (já trazem "membros")
      const map = {};
      (lista || []).forEach((a) => {
        const key = a.data;
        if (!map[key]) map[key] = [];
        map[key].push({
          id: a.id,
          servico: a.servico,
          cliente: a.cliente,
          horario: a.horario,
          valor: a.valor,
          status: a.status,
          obs: a.obs,
          membros: a.membros || [],
        });
      });
      state.events = map;
    } catch (e) {
      console.error('Falha ao carregar agendamentos:', e);
      JC.toast('Não foi possível carregar a agenda.', 'error');
      state.events = {};
    }
    renderCalendar();
    renderTable();
  }

  // Funcionários cadastrados (para o seletor de colaboradores) — direto da API
  async function carregarFuncionarios() {
    try {
      const lista = await JC.api.funcionarios.list();
      state.emps = (lista || []).map((f) => f.nome);
    } catch (e) {
      state.emps = []; // ainda sem funcionários cadastrados
    }
  }

  function findEvent(id) {
    for (const k in state.events) {
      const hit = state.events[k].find((e) => String(e.id) === String(id));
      if (hit) return Object.assign({ key: k }, hit);
    }
    return null;
  }

  /* ---------- Renderizar calendário ---------- */
  function renderCalendar() {
    const { currentYear: year, currentMonth: month } = state;

    const label = document.getElementById('current-month-label');
    if (label) label.textContent = monthName(month, year);
    syncSelectors();

    const grid = document.getElementById('days-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'day-cell empty';
      const placeholder = document.createElement('button');
      placeholder.className = 'day-btn';
      placeholder.setAttribute('aria-hidden', 'true');
      empty.appendChild(placeholder);
      grid.appendChild(empty);
    }

    for (let day = 1; day <= totalDays; day++) {
      const key = dateKey(year, month, day);
      const cell = document.createElement('div');
      cell.className = 'day-cell';

      const btn = document.createElement('button');
      btn.className = 'day-btn';
      btn.textContent = day;
      btn.setAttribute('aria-label', `${day}/${month + 1}/${year}`);

      const t = state.today;
      if (t.getFullYear() === year && t.getMonth() === month && t.getDate() === day) {
        btn.classList.add('today');
      }

      if (state.events[key] && state.events[key].length > 0) {
        btn.classList.add('has-event');
        if (state.events[key].length > 1) {
          const badge = document.createElement('span');
          badge.className = 'event-count';
          badge.textContent = state.events[key].length;
          btn.appendChild(badge);
        }
      }

      // Clique no dia: novo agendamento naquela data.
      btn.addEventListener('click', () => abrirModal(key, null));
      cell.appendChild(btn);
      grid.appendChild(cell);
    }
  }

  function membrosAvatares(membros) {
    if (!membros || !membros.length) return '';
    const max = 5;
    let html = membros.slice(0, max).map((m) =>
      `<span class="svc-av" style="background:${colorFor(m.nome)}" title="${escHtml(m.nome)}">${escHtml(initials(m.nome))}</span>`
    ).join('');
    if (membros.length > max) html += `<span class="svc-av more" title="mais ${membros.length - max}">+${membros.length - max}</span>`;
    return `<div class="svc-membros">${html}</div>`;
  }

  /* ---------- Renderizar tabela ---------- */
  function renderTable() {
    const tbody = document.getElementById('services-tbody');
    const countEl = document.getElementById('services-count');
    if (!tbody) return;
    tbody.innerHTML = '';

    let allEvents = [];
    for (const [key, evts] of Object.entries(state.events)) {
      evts.forEach((evt) => { allEvents.push({ key, ...evt }); });
    }
    allEvents.sort((a, b) => {
      if (a.key !== b.key) return a.key.localeCompare(b.key);
      return (a.horario || '').localeCompare(b.horario || '');
    });

    if (countEl) {
      countEl.textContent = `${allEvents.length} serviço${allEvents.length !== 1 ? 's' : ''}`;
    }

    const totalEl = document.getElementById('services-total');
    if (totalEl) {
      const total = allEvents.reduce((soma, e) => {
        const v = parseFloat(e.valor);
        return soma + (e.status !== 'cancelado' && !isNaN(v) && v > 0 ? v : 0);
      }, 0);
      totalEl.textContent = total > 0
        ? 'Total: ' + total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '';
    }

    if (allEvents.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row" id="empty-row">
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon"><i class="bi bi-calendar2-week"></i></div>
              <p>Nenhum serviço agendado ainda.<br>Clique em um dia no calendário para começar.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    allEvents.forEach(({ key, id, servico, cliente, horario, valor, status, membros }) => {
      const tr = document.createElement('tr');
      tr.className = 'svc-row';
      tr.dataset.id = id;

      const valorNum = parseFloat(valor);
      const valorFormatted = !isNaN(valorNum) && valorNum > 0
        ? valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '—';
      const valorClass = (!isNaN(valorNum) && valorNum > 0) ? 'value-cell' : 'value-cell zero';

      const st = STATUS_MAP[status] || STATUS_MAP.pendente;
      const [yy, mm, dd] = key.split('-');
      const weekday = WEEKDAYS_SHORT[new Date(key + 'T00:00:00').getDay()];

      tr.innerHTML = `
        <td><div class="svc-date">${dd}/${mm}<span class="wd">${weekday}</span></div></td>
        <td class="svc-name">${escHtml(servico)}${membrosAvatares(membros)}</td>
        <td>${escHtml(cliente)}</td>
        <td>${horario || '—'}</td>
        <td class="num ${valorClass}">${valorFormatted}</td>
        <td><span class="status-badge ${st.cls}">${st.label}</span></td>
        <td class="num svc-actions">
          <button class="btn-edit" data-id="${id}" aria-label="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn-delete" data-id="${id}" aria-label="Remover"><i class="bi bi-trash3"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Editar: botão ou clique na linha (menos nos botões de ação)
    tbody.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); editar(btn.dataset.id); });
    });
    tbody.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteEvent(btn.dataset.id); });
    });
    tbody.querySelectorAll('.svc-row').forEach((row) => {
      row.addEventListener('click', () => editar(row.dataset.id));
    });
  }

  function editar(id) {
    const ev = findEvent(id);
    if (ev) abrirModal(ev.key, ev);
  }

  /* ---------- Modal: cria (existente=null) ou edita (existente=obj) ---------- */
  function abrirModal(key, existente) {
    const d = new Date(key + 'T00:00:00');
    const subtitle = pad(d.getDate()) + ' ' + MESES_CURTO[d.getMonth()] + ' ' + d.getFullYear();
    const passado = key < todayKey();
    const editId = existente ? existente.id : '';

    // Datas passadas: Concluído/Cancelado. Hoje/futuro: Confirmado/Pendente/Cancelado.
    let statusOpts = passado
      ? [{ value: 'concluido', label: 'Concluído' }, { value: 'cancelado', label: 'Cancelado' }]
      : [{ value: 'confirmado', label: 'Confirmado' }, { value: 'pendente', label: 'Pendente' }, { value: 'cancelado', label: 'Cancelado' }];
    // Ao editar, garante que o status atual apareça mesmo se fugir da regra (dado antigo)
    if (existente && existente.status && !statusOpts.some((o) => o.value === existente.status)) {
      statusOpts.unshift({ value: existente.status, label: (STATUS_MAP[existente.status] || {}).label || existente.status });
    }

    const emps = state.emps || [];
    const membrosSel = (existente && existente.membros ? existente.membros : []).map((m) => m.nome);

    JC.modal.open({
      title: editId ? 'Editar agendamento' : 'Novo agendamento',
      subtitle: subtitle,
      submitText: editId ? 'Salvar alterações' : 'Salvar agendamento',
      maxWidth: '560px',
      fields: [
        { id: 'servico', label: 'Serviço', type: 'text', required: true, value: existente ? existente.servico || '' : '', placeholder: 'Ex.: Instalação de painel solar' },
        { id: 'cliente', label: 'Cliente', type: 'text', required: true, value: existente ? existente.cliente || '' : '', placeholder: 'Nome do cliente' },
        { id: 'horario', label: 'Horário', type: 'time', required: true, half: true, value: existente ? existente.horario || '' : '' },
        { id: 'valor', label: 'Valor (R$)', type: 'number', step: '0.01', min: '0', inputmode: 'decimal', half: true,
          value: existente && existente.valor != null && Number(existente.valor) !== 0 ? existente.valor : '', placeholder: '0,00' },
        { id: 'status', label: 'Status', type: 'select', options: statusOpts,
          value: existente ? existente.status : (passado ? 'concluido' : 'confirmado') },
        { id: 'colaboradores', label: 'Colaboradores (funcionários)', type: 'chips', value: membrosSel,
          options: emps.map((n) => ({ value: n, label: n, avatar: { color: colorFor(n), initials: initials(n) } })),
          hint: emps.length ? 'Toque para incluir/remover quem vai no serviço.' : 'Cadastre funcionários para escolher aqui.' },
        { id: 'obs', label: 'Observações', type: 'textarea', rows: 3, value: existente ? existente.obs || '' : '', placeholder: 'Opcional' }
      ],
      onSubmit: async function (vals) {
        const status = vals.status || (passado ? 'concluido' : 'confirmado');
        const statusMudou = !existente || status !== existente.status;
        if (statusMudou) {
          if (passado && (status === 'confirmado' || status === 'pendente')) {
            throw new Error('Datas passadas só podem ser Concluído ou Cancelado.');
          }
          if (!passado && status === 'concluido') {
            throw new Error('"Concluído" vale apenas para datas passadas.');
          }
        }
        const v = parseFloat(String(vals.valor).replace(',', '.'));
        const membros = (vals.colaboradores || []).map((n) => ({ nome: n, tipo: 'funcionario' }));
        const body = {
          data: key,
          servico: String(vals.servico).trim(),
          cliente: String(vals.cliente).trim(),
          horario: vals.horario,
          status: status,
          obs: String(vals.obs || '').trim(),
          membros: membros
        };
        if (!isNaN(v) && v > 0) body.valor = v;

        if (editId) await JC.api.agendamentos.update(editId, body);
        else await JC.api.agendamentos.create(body);
        JC.toast(editId ? 'Agendamento atualizado!' : 'Agendamento salvo com sucesso!', 'success');
        await carregar();
      }
    });
  }

  function deleteEvent(id) {
    JC.confirm({ message: 'Deseja remover este agendamento?', confirmText: 'Remover', danger: true }).then(async function (ok) {
      if (!ok) return;
      try {
        await JC.api.agendamentos.remove(id);
        JC.toast('Agendamento removido.', 'success');
        await carregar();
      } catch (e) {
        console.error(e);
        JC.toast('Erro ao remover o agendamento.', 'error');
      }
    });
  }

  /* ---------- Eventos de UI ---------- */
  document.getElementById('prev-month')?.addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    renderCalendar();
  });

  document.getElementById('next-month')?.addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    renderCalendar();
  });

  document.getElementById('sel-month')?.addEventListener('change', (e) => {
    state.currentMonth = Number(e.target.value);
    renderCalendar();
  });

  document.getElementById('sel-year')?.addEventListener('change', (e) => {
    state.currentYear = Number(e.target.value);
    renderCalendar();
  });

  document.getElementById('btn-today')?.addEventListener('click', () => {
    const now = new Date();
    state.currentMonth = now.getMonth();
    state.currentYear = now.getFullYear();
    renderCalendar();
  });

  /* ---------- Init ---------- */
  if (!document.getElementById('cal-extra-style')) {
    const st = document.createElement('style');
    st.id = 'cal-extra-style';
    st.textContent =
      '.status-badge.concluido{background:#e7f6ee;color:#0a7a4a;}' +
      '.svc-row{cursor:pointer;}' +
      '.svc-actions{white-space:nowrap;}' +
      '.btn-edit{background:none;border:0;color:var(--text-muted,#9AA6BC);cursor:pointer;padding:6px;border-radius:6px;}' +
      '.btn-edit:hover{color:var(--brand,#F97315);background:rgba(249,115,21,.12);}' +
      '.svc-membros{display:flex;gap:3px;margin-top:5px;flex-wrap:wrap;}' +
      '.svc-av{width:20px;height:20px;border-radius:50%;font-size:9px;font-weight:700;color:#fff;display:inline-flex;align-items:center;justify-content:center;line-height:1;}' +
      '.svc-av.more{background:#64748b;}';
    document.head.appendChild(st);
  }
  populateSelectors();
  renderCalendar();
  renderTable();
  carregarFuncionarios();
  carregar();
})();
