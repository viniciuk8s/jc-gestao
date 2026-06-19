/* ============================================================
   layout.js — Componente único de navegação (sidebar + topbar)
   Injeta o mesmo sidebar em todas as páginas, evitando repetição.
   A página indica a seção atual com <body data-page="...">.
   Deve carregar ANTES de sidebar.js e dropdown.js.
   ============================================================ */
'use strict';

(function () {
  // Evita injeção dupla
  if (document.getElementById('sidebar')) return;

  var LAYOUT = `
  <header class="mobile-topbar">
    <button class="menu-btn" onclick="openSidebar(this)" aria-label="Abrir menu">
      <i class="bi bi-list"></i>
    </button>
    <div class="mobile-logo">
      <span class="logo-title">JC · Elétrica &amp; Solar</span>
    </div>
  </header>

  <div id="overlay" class="overlay" onclick="closeSidebar(this)"></div>

  <aside id="sidebar" class="sidebar">

    <!-- Perfil -->
    <div class="profile-wrap">
      <div class="profile-btn" id="profileBtn" onclick="toggleDropdown(this)">
        <div class="avatar">JC</div>
        <div class="profile-meta">
          <span class="profile-name">João Carlos</span>
          <span class="profile-role">CEO</span>
        </div>
        <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div class="dropdown" id="dropdown">
        <div class="dd-header"></div>
        <div class="dd-body">
          <button class="dd-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Meu Perfil
          </button>
          <button class="dd-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Configurações
          </button>
          <div class="dd-sep"></div>
          <button class="dd-item logout" onclick="logout(this)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sair da conta
          </button>
        </div>
      </div>
    </div>

    <button onclick="toggleCollapse()" class="collapse-btn" aria-label="Recolher menu">
      <i id="btn-icon-collapse" class="ti ti-layout-sidebar-left-collapse"></i>
    </button>

    <!-- Navegação -->
    <nav class="sidebar-nav">
      <a href="index.html" class="nav-item" data-nav="painel" onclick="setActive(this)">
        <div class="nav-icon"><i class="bi bi-grid"></i></div>
        <span class="nav-label">Painel Principal</span>
      </a>

      <span class="nav-section-title">Módulos</span>

      <a href="fluxo-caixa.html" class="nav-item" data-nav="fluxo" onclick="setActive(this)">
        <div class="nav-icon"><i class="bi bi-currency-dollar"></i></div>
        <span class="nav-label">Fluxo de Caixa</span>
      </a>

      <a href="agendamento.html" class="nav-item" data-nav="agenda" onclick="setActive(this)">
        <div class="nav-icon"><i class="bi bi-calendar-check"></i></div>
        <span class="nav-label">Agenda</span>
      </a>

      <a href="relatorios.html" class="nav-item" data-nav="relatorios" onclick="setActive(this)">
        <div class="nav-icon"><i class="bi bi-stickies"></i></div>
        <span class="nav-label">Relatórios</span>
      </a>

      <div class="divider"></div>
      <span class="nav-section-title">Gestão</span>

      <button class="nav-item" data-nav="bot" onclick="setActive(this)">
        <div class="nav-icon"><i class="bi bi-whatsapp"></i></div>
        <span class="nav-label">Bot do Whatsapp</span>
      </button>

      <a href="funcionarios.html" class="nav-item" data-nav="funcionarios" onclick="setActive(this)">
        <div class="nav-icon"><i class="bi bi-people-fill"></i></div>
        <span class="nav-label">Funcionários</span>
      </a>

      <a href="projetos.html" class="nav-item" data-nav="projetos" onclick="setActive(this)">
        <div class="nav-icon"><i class="bi bi-palette2"></i></div>
        <span class="nav-label">Projetos</span>
      </a>
    </nav>

    <!-- Rodapé / relógio -->
    <div class="sidebar-header">
      <div class="logo-texts">
        <span id="clock" class="sidebar-logo-sub"></span>
      </div>
      <button onclick="closeSidebar()" class="close-btn" aria-label="Fechar menu">
        <i class="ti ti-x"></i>
      </button>
    </div>

  </aside>`;

  // Injeta no início do <body>
  document.body.insertAdjacentHTML('afterbegin', LAYOUT);

  // Marca o item ativo conforme a página atual
  var page = document.body.getAttribute('data-page');
  if (page) {
    var item = document.querySelector('.nav-item[data-nav="' + page + '"]');
    if (item) {
      item.classList.add('active', 'active-primary');
      var ico = item.querySelector('.nav-icon');
      if (ico) ico.classList.add('active-icon', 'active-icon-primary');
      var lab = item.querySelector('.nav-label');
      if (lab) lab.classList.add('active-label', 'active-label-primary');
    }
  }

  // Relógio (o <script> inline antigo não roda quando injetado via innerHTML)
  function tickClock() {
    var el = document.getElementById('clock');
    if (!el) return;
    var n = new Date();
    el.textContent = n.toLocaleDateString('pt-BR') + ' - ' + n.toLocaleTimeString('pt-BR');
  }
  tickClock();
  setInterval(tickClock, 1000);
})();