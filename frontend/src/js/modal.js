/* ============================================================
   modal.js
   Modal de lançamento do Fluxo de Caixa.
   ============================================================ */
'use strict';

(function () {
  const modal = document.getElementById('modalOverlay');

  function openModal() {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Fecha ao clicar no backdrop
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Fecha com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) closeModal();
  });

  // Exposição para handlers inline
  window.openModal = openModal;
  window.closeModal = closeModal;
})();