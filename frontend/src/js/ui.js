/* ============================================================
   ui.js — Feedback de interface (namespace JC)
   Substitui os alert()/confirm() nativos por componentes estilizados:
     • JC.toast(mensagem, tipo, opts)   tipo: 'success' | 'error' | 'info'
     • JC.confirm({ title, message, confirmText, cancelText, danger })
        -> retorna uma Promise<boolean> (true = confirmou)

   Injeta o próprio CSS (classes .jc-*), herdando as cores dos tokens
   do tema via var(--…) com fallbacks. Não depende da SCSS nem colide
   com o .toast da agenda/login.

   Carregue depois de utils.js e antes dos scripts de página:
     <script src="src/js/utils.js"></script>
     <script src="src/js/ui.js"></script>
   ============================================================ */
(function (global) {
  'use strict';

  var JC = (global.JC = global.JC || {});

  /* ---------- CSS (injetado uma única vez) ---------- */
  var STYLE_ID = 'jc-ui-styles';
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.jc-toast-wrap{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
      'z-index:10010;display:flex;flex-direction:column;gap:10px;align-items:center;' +
      'pointer-events:none;width:max-content;max-width:calc(100vw - 32px);}' +
      '.jc-toast{pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:8px;' +
      'padding:12px 20px;border-radius:var(--r-full,999px);background:var(--surface-solid,#fff);' +
      'color:var(--text,#172E45);border:1px solid var(--border-strong,#D9CCB2);' +
      'box-shadow:var(--shadow-md,0 8px 24px rgba(0,0,0,.12));font-family:var(--font-body,system-ui,sans-serif);' +
      'font-size:.875rem;font-weight:500;line-height:1.3;max-width:100%;opacity:0;transform:translateY(16px);' +
      'transition:opacity .25s ease,transform .3s cubic-bezier(.16,1,.3,1);}' +
      '.jc-toast.jc-show{opacity:1;transform:translateY(0);}' +
      '.jc-toast::before{content:"";width:8px;height:8px;border-radius:50%;flex:none;' +
      'background:var(--text-muted,#5A6478);}' +
      '.jc-toast--success::before{background:var(--success,#0E9F6E);}' +
      '.jc-toast--error::before{background:var(--danger,#E11D48);}' +
      '.jc-toast--info::before{background:var(--brand,#F97316);}' +
      '.jc-confirm-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;' +
      'justify-content:center;padding:16px;background:rgba(19,26,43,.5);' +
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;transition:opacity .2s ease;}' +
      '.jc-confirm-overlay.jc-show{opacity:1;}' +
      '.jc-confirm{width:100%;max-width:400px;background:var(--surface,#fff);' +
      'border:1px solid var(--border-strong,#D9CCB2);border-radius:var(--r-lg,16px);' +
      'box-shadow:var(--shadow-lg,0 24px 60px rgba(0,0,0,.2));padding:24px;' +
      'transform:translateY(16px) scale(.97);transition:transform .25s cubic-bezier(.16,1,.3,1);' +
      'font-family:var(--font-body,system-ui,sans-serif);}' +
      '.jc-confirm-overlay.jc-show .jc-confirm{transform:translateY(0) scale(1);}' +
      '.jc-confirm-title{margin:0 0 8px;font-size:1.1rem;font-weight:700;color:var(--text,#172E45);}' +
      '.jc-confirm-msg{margin:0 0 22px;font-size:.9rem;line-height:1.5;color:var(--text-muted,#5A6478);}' +
      '.jc-confirm-foot{display:flex;gap:10px;justify-content:flex-end;}' +
      '.jc-btn{padding:10px 18px;border-radius:var(--r-sm,8px);border:1px solid transparent;' +
      'font-family:inherit;font-size:.875rem;font-weight:600;cursor:pointer;' +
      'transition:background .15s ease,border-color .15s ease,color .15s ease,transform .1s ease;}' +
      '.jc-btn:active{transform:translateY(1px);}' +
      '.jc-btn--ghost{background:transparent;border-color:var(--border,#E9E3D5);color:var(--text-muted,#5A6478);}' +
      '.jc-btn--ghost:hover{background:var(--surface-2,#F7F3EC);color:var(--text,#172E45);}' +
      '.jc-btn--solid{background:var(--brand-strong,#EF6A01);color:#fff;}' +
      '.jc-btn--solid:hover{background:var(--brand-dark,#C2560B);}' +
      '.jc-btn--danger{background:var(--danger,#E11D48);color:#fff;}' +
      '.jc-btn--danger:hover{filter:brightness(.93);}' +
      '@media (prefers-reduced-motion: reduce){.jc-toast,.jc-confirm,.jc-confirm-overlay{transition:none;}}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------- TOAST ---------- */
  var wrap = null;
  function container() {
    if (wrap && document.body.contains(wrap)) return wrap;
    wrap = document.createElement('div');
    wrap.className = 'jc-toast-wrap';
    document.body.appendChild(wrap);
    return wrap;
  }
  function toast(message, type, opts) {
    ensureStyles();
    opts = opts || {};
    var t = document.createElement('div');
    t.className = 'jc-toast jc-toast--' + (type || 'info');
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.textContent = message;
    container().appendChild(t);
    void t.offsetWidth; // força reflow p/ animar a entrada

    var done = false;
    function hide() {
      if (done) return;
      done = true;
      t.classList.remove('jc-show');
      setTimeout(function () { if (t.parentNode) t.remove(); }, 350);
    }
    t.classList.add('jc-show');
    var dur = opts.duration == null ? 3000 : opts.duration;
    var timer = setTimeout(hide, dur);
    t.addEventListener('click', function () { clearTimeout(timer); hide(); });
    return t;
  }

  /* ---------- CONFIRM ---------- */
  function confirmDialog(opts) {
    ensureStyles();
    opts = opts || {};
    var title = opts.title || 'Confirmar';
    var message = opts.message || 'Tem certeza?';
    var confirmText = opts.confirmText || 'Confirmar';
    var cancelText = opts.cancelText || 'Cancelar';
    var danger = !!opts.danger;

    return new Promise(function (resolve) {
      var lastFocus = document.activeElement;

      var overlay = document.createElement('div');
      overlay.className = 'jc-confirm-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      var box = document.createElement('div');
      box.className = 'jc-confirm';

      var h = document.createElement('h3');
      h.className = 'jc-confirm-title';
      h.textContent = title;

      var p = document.createElement('p');
      p.className = 'jc-confirm-msg';
      p.textContent = message; // textContent: seguro contra HTML injetado

      var foot = document.createElement('div');
      foot.className = 'jc-confirm-foot';

      var btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'jc-btn jc-btn--ghost';
      btnCancel.textContent = cancelText;

      var btnOk = document.createElement('button');
      btnOk.type = 'button';
      btnOk.className = 'jc-btn ' + (danger ? 'jc-btn--danger' : 'jc-btn--solid');
      btnOk.textContent = confirmText;

      foot.appendChild(btnCancel);
      foot.appendChild(btnOk);
      box.appendChild(h);
      box.appendChild(p);
      box.appendChild(foot);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      void overlay.offsetWidth;
      overlay.classList.add('jc-show');
      btnOk.focus();

      var settled = false;
      function close(result) {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKey, true);
        overlay.classList.remove('jc-show');
        var remove = function () {
          if (overlay.parentNode) overlay.remove();
          if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
        };
        setTimeout(remove, 250);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
        else if (e.key === 'Tab') {        // trap simples entre os dois botões
          var f = [btnCancel, btnOk];
          var i = f.indexOf(document.activeElement);
          e.preventDefault();
          f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1)].focus();
        }
      }
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
      btnCancel.addEventListener('click', function () { close(false); });
      btnOk.addEventListener('click', function () { close(true); });
    });
  }

  JC.toast = toast;
  JC.confirm = confirmDialog;
})(window);