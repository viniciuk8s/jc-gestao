/* ============================================================
   sidebar.js
   Navegação lateral: item ativo, colapso no desktop e
   comportamento off-canvas no mobile.
   ============================================================ */
'use strict';

(function () {
  const MOBILE_BREAKPOINT = 1024; // < 1024px = mobile
  const COLLAPSE_KEY = 'agendapro_sidebar_collapsed';

  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const sidebar = () => document.getElementById('sidebar');
  const overlay = () => document.getElementById('overlay');
  const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

  /* ---------- Off-canvas (mobile) ---------- */
  function openSidebar() {
    const sb = sidebar();
    if (!sb) return;
    sb.classList.add('show');
    overlay()?.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const sb = sidebar();
    if (!sb) return;
    sb.classList.remove('show');
    overlay()?.classList.remove('show');
    document.body.style.overflow = '';
  }

  /* ---------- Colapso (desktop) ---------- */
  function applyCollapsedIcon(collapsed) {
    const icon = document.getElementById('btn-icon-collapse');
    if (!icon) return;
    icon.classList.toggle('ti-layout-sidebar-left-collapse', !collapsed);
    icon.classList.toggle('ti-layout-sidebar-left-expand', collapsed);
  }

  function setCollapsed(collapsed) {
    const sb = sidebar();
    if (!sb) return;
    sb.classList.toggle('collapsed', collapsed);
    applyCollapsedIcon(collapsed);
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch (_) {}
  }

  function toggleCollapse() {
    const sb = sidebar();
    if (!sb || isMobile()) return; // botão de recolher não existe no mobile
    setCollapsed(!sb.classList.contains('collapsed'));
  }

  /* ---------- Item de navegação ativo ---------- */
  function setActive(btn) {
    if (!btn) return;

    $$('.nav-item').forEach((item) => {
      item.classList.remove('active', 'active-primary');
      item.querySelector('.nav-icon')?.classList.remove('active-icon', 'active-icon-primary');
      item.querySelector('.nav-label')?.classList.remove('active-label', 'active-label-primary');
    });

    btn.classList.add('active');
    btn.querySelector('.nav-icon')?.classList.add('active-icon');
    btn.querySelector('.nav-label')?.classList.add('active-label');

    if (isMobile()) closeSidebar();
    // Itens que são <a href> seguem navegando normalmente.
  }

  /* ---------- Eventos globais ---------- */
  // Clicar fora fecha o menu (apenas mobile)
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    const sb = sidebar();
    if (!sb || !sb.classList.contains('show')) return;
    const menuBtn = document.querySelector('.menu-btn');
    const clickedInside = sb.contains(e.target);
    const clickedMenu = menuBtn && menuBtn.contains(e.target);
    if (!clickedInside && !clickedMenu) closeSidebar();
  });

  // ESC fecha no mobile
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMobile()) closeSidebar();
  });

  // Ao voltar para o desktop, limpa qualquer estado off-canvas herdado
  window.addEventListener('resize', () => {
    if (!isMobile()) closeSidebar();
  });

  /* ---------- Inicialização ---------- */
  (function init() {
    let collapsed = false;
    try { collapsed = localStorage.getItem(COLLAPSE_KEY) === '1'; } catch (_) {}
    if (collapsed && !isMobile()) setCollapsed(true);
    else applyCollapsedIcon(false);
  })();

  /* ---------- Exposição para handlers inline do HTML ---------- */
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleCollapse = toggleCollapse;
  window.setActive = setActive;
})();