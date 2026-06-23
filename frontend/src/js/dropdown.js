/* ============================================================
   dropdown.js
   Menu suspenso do perfil (abrir/fechar) e busca.
   O logout é tratado no layout.js (signOut do Supabase + redirect).
   ============================================================ */
'use strict';

(function () {
  const profileBtn = document.getElementById('profileBtn');
  const dropdown = document.getElementById('dropdown');

  function openDropdown() {
    dropdown?.classList.add('open');
    profileBtn?.classList.add('active');
  }

  function closeDropdown() {
    dropdown?.classList.remove('open');
    profileBtn?.classList.remove('active');
  }

  function toggleDropdown() {
    if (!dropdown) return;
    dropdown.classList.contains('open') ? closeDropdown() : openDropdown();
  }

  function focusSearch() {
    document.getElementById('searchInput')?.focus();
  }

  // Fecha ao clicar fora do perfil
  document.addEventListener('click', (e) => {
    const wrap = profileBtn?.closest('.profile-wrap');
    if (wrap && !wrap.contains(e.target)) closeDropdown();
  });

  // Fecha com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });

  // Exposição para handlers inline
  window.toggleDropdown = toggleDropdown;
  window.focusSearch = focusSearch;
  // (logout removido daqui — fica a cargo do layout.js)
})();