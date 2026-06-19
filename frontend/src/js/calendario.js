/* ============================================================
   calendario.js — AgendaPro
   Calendário, tabela de serviços e modal de agendamento.
   ============================================================ */
'use strict';

(function () {
  // Só inicializa se a página tiver o calendário.
  if (!document.getElementById('days-grid')) return;

  var JC = window.JC;
  var escHtml = JC.esc; // helper compartilhado (ver utils.js)

  /* ---------- Estado global ---------- */
  const state = {
    today: new Date(),
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-based
    events: JSON.parse(localStorage.getItem('agendapro_events') || '{}'),
    editingDate: null, // chave "YYYY-MM-DD" sendo editada
  };

  /* ---------- Helpers de data ---------- */
  const pad = (n) => String(n).padStart(2, '0');

  function dateKey(year, month, day) {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
  }

  function formatDateDisplay(key) {
    const [y, m, d] = key.split('-');
    return `${d}/${m}/${y}`;
  }

  function monthName(month, year) {
    return new Date(year, month, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                       'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

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
      // garante a opção do ano caso esteja fora do range pré-criado
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

  /* ---------- Persistência ---------- */
  function saveEvents() {
    try {
      localStorage.setItem('agendapro_events', JSON.stringify(state.events));
    } catch (_) { /* armazenamento indisponível */ }
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

    const firstDay = new Date(year, month, 1).getDay(); // 0 = Dom
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Células vazias para alinhar o primeiro dia
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'day-cell empty';
      const placeholder = document.createElement('button');
      placeholder.className = 'day-btn';
      placeholder.setAttribute('aria-hidden', 'true');
      empty.appendChild(placeholder);
      grid.appendChild(empty);
    }

    // Dias do mês
    for (let day = 1; day <= totalDays; day++) {
      const key = dateKey(year, month, day);
      const cell = document.createElement('div');
      cell.className = 'day-cell';

      const btn = document.createElement('button');
      btn.className = 'day-btn';
      btn.textContent = day;
      btn.setAttribute('aria-label', `${day}/${month + 1}/${year}`);

      // Marcar hoje
      const t = state.today;
      if (t.getFullYear() === year && t.getMonth() === month && t.getDate() === day) {
        btn.classList.add('today');
      }

      // Marcar dias com eventos
      if (state.events[key] && state.events[key].length > 0) {
        btn.classList.add('has-event');

        if (state.events[key].length > 1) {
          const badge = document.createElement('span');
          badge.className = 'event-count';
          badge.textContent = state.events[key].length;
          btn.appendChild(badge);
        }
      }

      btn.addEventListener('click', () => openModal(key, year, month, day));
      cell.appendChild(btn);
      grid.appendChild(cell);
    }
  }

  /* ---------- Renderizar tabela ---------- */
  function renderTable() {
    const tbody = document.getElementById('services-tbody');
    const countEl = document.getElementById('services-count');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Coleta e ordena todos os eventos por data
    let allEvents = [];
    for (const [key, evts] of Object.entries(state.events)) {
      evts.forEach((evt, idx) => {
        allEvents.push({ key, idx, ...evt });
      });
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

    allEvents.forEach(({ key, idx, servico, cliente, horario, valor, status }) => {
      const tr = document.createElement('tr');

      const valorNum = parseFloat(valor);
      const valorFormatted = !isNaN(valorNum) && valorNum > 0
        ? valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '—';
      const valorClass = (!isNaN(valorNum) && valorNum > 0) ? 'value-cell' : 'value-cell zero';

      const statusMap = {
        confirmado: { label: 'Confirmado', cls: 'confirmado' },
        pendente:   { label: 'Pendente',   cls: 'pendente' },
        cancelado:  { label: 'Cancelado',  cls: 'cancelado' },
      };
      const st = statusMap[status] || statusMap.pendente;

      const [yy, mm, dd] = key.split('-');
      const weekday = WEEKDAYS_SHORT[new Date(key + 'T00:00:00').getDay()];

      tr.innerHTML = `
        <td><div class="svc-date">${dd}/${mm}<span class="wd">${weekday}</span></div></td>
        <td class="svc-name">${escHtml(servico)}</td>
        <td>${escHtml(cliente)}</td>
        <td>${horario || '—'}</td>
        <td class="num ${valorClass}">${valorFormatted}</td>
        <td><span class="status-badge ${st.cls}">${st.label}</span></td>
        <td class="num"><button class="btn-delete" data-key="${key}" data-idx="${idx}" aria-label="Remover"><i class="bi bi-trash3"></i></button></td>
      `;
      tbody.appendChild(tr);
    });

    // Listeners de remoção
    tbody.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { key, idx } = btn.dataset;
        deleteEvent(key, parseInt(idx, 10));
      });
    });
  }

  /* ---------- Modal ---------- */
  const overlay = document.getElementById('modal-overlay');

  function openModal(key, year, month, day) {
    state.editingDate = key;

    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const badge = document.getElementById('modal-date-badge');
    if (badge) badge.textContent = `${pad(day)} ${months[month]} ${year}`;

    clearForm();
    const err = document.getElementById('form-error');
    if (err) err.textContent = '';

    if (!overlay) return;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('field-servico')?.focus(), 120);
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    state.editingDate = null;
  }

  function clearForm() {
    ['field-servico','field-cliente','field-horario','field-valor','field-obs'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const status = document.getElementById('field-status');
    if (status) status.value = 'confirmado';
  }

  function getFormData() {
    const val = (id) => document.getElementById(id)?.value ?? '';
    return {
      servico: val('field-servico').trim(),
      cliente: val('field-cliente').trim(),
      horario: val('field-horario'),
      valor:   val('field-valor'),
      status:  val('field-status') || 'confirmado',
      obs:     val('field-obs').trim(),
    };
  }

  function saveEvent() {
    const data = getFormData();
    const errorEl = document.getElementById('form-error');
    const setErr = (msg) => { if (errorEl) errorEl.textContent = msg; };

    if (!data.servico) { setErr('Por favor, informe o nome do serviço.'); return; }
    if (!data.cliente) { setErr('Por favor, informe o nome do cliente.'); return; }
    if (!data.horario) { setErr('Por favor, informe o horário.'); return; }
    setErr('');

    const key = state.editingDate;
    if (!key) return;
    if (!state.events[key]) state.events[key] = [];
    state.events[key].push(data);

    saveEvents();
    renderCalendar();
    renderTable();
    closeModal();
    JC.toast('Agendamento salvo com sucesso!', 'success');
  }

  function deleteEvent(key, idx) {
    JC.confirm({ message: 'Deseja remover este agendamento?', confirmText: 'Remover', danger: true }).then(function (ok) {
      if (!ok || !state.events[key]) return;
      state.events[key].splice(idx, 1);
      if (state.events[key].length === 0) delete state.events[key];
      saveEvents();
      renderCalendar();
      renderTable();
      JC.toast('Agendamento removido.', 'success');
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

  document.getElementById('btn-save')?.addEventListener('click', saveEvent);
  document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
  document.getElementById('modal-close')?.addEventListener('click', closeModal);

  // Fechar modal clicando fora
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Fechar com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay?.classList.contains('active')) closeModal();
  });

  // Salvar com Enter (dentro do modal, fora do textarea/botão)
  overlay?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
      saveEvent();
    }
  });

  /* ---------- Init ---------- */
  populateSelectors();
  renderCalendar();
  renderTable();
})();