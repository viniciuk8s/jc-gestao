/* ============================================================
   modal.js — Modal padrão e dinâmico (JC.modal)
   Um único componente para Agendamento, Serviço, Relatórios, etc.
   100% em JavaScript e autossuficiente (injeta o próprio CSS).
   Tema: vidro escuro + laranja (sem violeta).

   USO:
     const ctrl = JC.modal.open({
       title: 'Novo agendamento',
       subtitle: 'Cadastre um serviço na agenda',
       submitText: 'Salvar',
       fields: [
         { id:'data', label:'Data', type:'date', required:true, half:true },
         { id:'horario', label:'Horário', type:'time', half:true },
         { id:'cliente', label:'Cliente', type:'text' },
         { id:'servico', label:'Serviço', type:'text', required:true },
         { id:'valor', label:'Valor (R$)', type:'number', step:'0.01', half:true },
         { id:'status', label:'Status', type:'select', half:true,
           options:[{value:'confirmado',label:'Confirmado'},{value:'pendente',label:'Pendente'}] },
       ],
       onSubmit: async (vals, ctrl) => {
         await JC.api.agendamentos.create(vals);  // se rejeitar, ctrl mostra o erro
       }
     });
   ============================================================ */
(function () {
  'use strict';
  window.JC = window.JC || {};
  if (window.JC.modal) return;

  var ACCENT     = 'var(--brand)';
  var ACCENT_LO  = 'var(--brand-2)';
  var ACCENT_HI  = 'var(--brand-3)';

  /* ---------- CSS injetado uma vez ---------- */
  function injectCSS() {
    if (document.getElementById('jcm-style')) return;
    var css = [
      '.jcm-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--overlay-bg);-webkit-backdrop-filter:var(--overlay-blur);backdrop-filter:var(--overlay-blur);opacity:0;transition:opacity .22s ease}',
      '.jcm-overlay.show{opacity:1}',
      '.jcm{width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;color:var(--text);background:var(--modal-bg);-webkit-backdrop-filter:blur(20px) saturate(135%);backdrop-filter:blur(20px) saturate(135%);border:1px solid var(--modal-border);border-radius:4px;overflow:hidden;box-shadow:none;transform:translateY(10px) scale(.99);transition:transform .26s cubic-bezier(.2,.7,.2,1);font-family:inherit}',
      '.jcm-overlay.show .jcm{transform:none}',
      '.jcm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 14px;border-bottom:1px solid var(--line)}',
      '.jcm-title{margin:0;font-family:"Sora",system-ui,sans-serif;font-size:19px;font-weight:700;color:var(--heading);letter-spacing:-.01em}',
      '.jcm-sub{margin:4px 0 0;font-size:13px;color:var(--text-muted)}',
      '.jcm-x{flex:none;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:0;border-radius:4px;background:transparent;color:var(--text-muted);font-size:22px;line-height:1;cursor:pointer;transition:background .15s,color .15s}',
      '.jcm-x:hover{background:var(--brand-soft);color:#fff}',
      '.jcm-form{display:flex;flex-direction:column;min-height:0}',
      '.jcm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px 22px 6px;overflow-y:auto}',
      '.jcm-group{display:flex;flex-direction:column}',
      '.jcm-group.full{grid-column:1 / -1}',
      '.jcm-group label{margin-bottom:6px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted)}',
      '.jcm-group label .req{color:' + ACCENT + ';margin-left:2px}',
      '.jcm-field{width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid var(--modal-field-bd);border-radius:4px;background:var(--modal-field);color:var(--text);font-size:14.5px;line-height:1.3;font-family:inherit;transition:border-color .15s,box-shadow .15s,background .15s}',
      '.jcm-field::placeholder{color:rgba(154,166,188,.7)}',
      '.jcm-field:hover{border-color:var(--border-strong)}',
      '.jcm-field:focus{outline:none;border-color:' + ACCENT + ';background:var(--surface-2);box-shadow:0 0 0 3px var(--brand-soft)}',
      '.jcm-field[type="date"],.jcm-field[type="time"],.jcm-field[type="month"]{color-scheme:inherit}',
      'select.jcm-field{appearance:none;-webkit-appearance:none;padding-right:38px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239AA6BC\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center}',
      'select.jcm-field option{color:#16212D}',
      'textarea.jcm-field{resize:vertical;min-height:72px}',
      '.jcm-error{margin:0;min-height:18px;font-size:13px;color:var(--danger);padding:2px 22px 0}',
      '.jcm-hint{display:block;margin-top:5px;font-size:11.5px;color:var(--text-muted);line-height:1.35}',
      '.jcm-hint:empty{display:none}',
      '.jcm-section{grid-column:1 / -1;margin:8px 0 -2px;padding-top:14px;border-top:1px solid var(--line);font-family:"Sora",system-ui,sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:' + ACCENT + '}',
      '.jcm-avatar{display:flex;align-items:center;gap:16px}',
      '.jcm-avatar-prev{width:74px;height:74px;flex:none;border-radius:50%;background:var(--surface) center/cover no-repeat;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-dim)}',
      '.jcm-avatar-prev svg{width:30px;height:30px}',
      '.jcm-avatar-btns{display:flex;flex-direction:column;gap:8px;align-items:flex-start}',
      '.jcm-avatar-rem{background:none;border:0;padding:0;color:var(--text-muted);font-size:12px;cursor:pointer;font-family:inherit}',
      '.jcm-avatar-rem:hover{color:var(--danger)}',
      '.jcm-range{padding:0;background:transparent;border:0;accent-color:' + ACCENT + ';height:30px;cursor:pointer}',
      '.jcm-range:focus{outline:none;box-shadow:none}',
      '.jcm-range-val{margin-left:6px;color:' + ACCENT + ';font-weight:700}',
      '.jcm-chips{display:flex;flex-wrap:wrap;gap:8px}',
      '.jcm-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .12s,border-color .12s}',
      '.jcm-chip:hover{border-color:var(--border-strong)}',
      '.jcm-chip.on{background:var(--brand-soft);border-color:' + ACCENT + ';color:#fff}',
      '.jcm-chip-av{width:22px;height:22px;flex:none;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:800}',
      '.jcm-tagadd{display:flex;gap:8px}',
      '.jcm-tagadd .jcm-field{flex:1}',
      '.jcm-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
      '.jcm-tags:empty{display:none}',
      '.jcm-tag{display:inline-flex;align-items:center;gap:6px;padding:6px 8px 6px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--border);font-size:13px;color:var(--text)}',
      '.jcm-tag button{border:0;background:none;color:var(--text-muted);font-size:16px;line-height:1;cursor:pointer;padding:0}',
      '.jcm-tag button:hover{color:var(--danger)}',
      '.jcm-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 22px 20px;border-top:1px solid var(--line)}',
      '.jcm-btn{padding:11px 20px;border-radius:4px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;border:1px solid transparent;transition:filter .15s,background .15s,transform .12s}',
      '.jcm-btn:focus-visible{outline:2px solid ' + ACCENT + ';outline-offset:2px}',
      '.jcm-btn.sec{background:var(--surface);color:var(--text);border-color:var(--border)}',
      '.jcm-btn.sec:hover{background:var(--surface-2)}',
      '.jcm-btn.pri{color:#fff;background:linear-gradient(180deg,' + ACCENT_LO + ' 0%,' + ACCENT + ' 55%,' + ACCENT_HI + ' 100%)}',
      '.jcm-btn.pri:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-1px)}',
      '.jcm-btn:disabled{opacity:.65;cursor:default}',
      '.jcm-btn.pri .jcm-spin{display:none;width:15px;height:15px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;margin-right:8px;vertical-align:-2px;animation:jcm-spin .8s linear infinite}',
      '.jcm-btn.pri.loading .jcm-spin{display:inline-block}',
      '@keyframes jcm-spin{to{transform:rotate(360deg)}}',
      'body.jcm-open{overflow:hidden}',
      '@media (max-width:640px){.jcm-overlay{align-items:flex-end;padding:0}.jcm{max-width:100%;max-height:92dvh;border-radius:14px 14px 0 0;transform:translateY(100%)}.jcm-overlay.show .jcm{transform:none}.jcm-head{position:sticky;top:0;background:var(--modal-bg)}.jcm-grid{grid-template-columns:1fr}.jcm-field{font-size:16px}.jcm-foot{position:sticky;bottom:0;background:var(--modal-bg)}.jcm-foot .jcm-btn{flex:1;min-height:48px}}',
      '@media (prefers-reduced-motion:reduce){.jcm-overlay,.jcm{transition:none}.jcm{transform:none}}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'jcm-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // Redimensiona e recorta (quadrado) a imagem para um dataURL leve — bom para localStorage
  function downscaleImage(file, size, cb) {
    try {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var canvas = el('canvas'); canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          var scale = Math.max(size / img.width, size / img.height);
          var w = img.width * scale, h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          try { cb(canvas.toDataURL('image/jpeg', 0.82)); } catch (e) { cb(reader.result); }
        };
        img.onerror = function () { cb(reader.result); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    } catch (e) {}
  }

  var aberto = null;

  function close() {
    if (!aberto) return;
    var ov = aberto.overlay;
    ov.classList.remove('show');
    document.body.classList.remove('jcm-open');
    document.removeEventListener('keydown', aberto.onKey);
    var ref = ov;
    setTimeout(function () { if (ref && ref.parentNode) ref.parentNode.removeChild(ref); }, 240);
    aberto = null;
  }

  function open(cfg) {
    cfg = cfg || {};
    injectCSS();
    close();

    var overlay = el('div', 'jcm-overlay');
    var card    = el('div', 'jcm');
    if (cfg.maxWidth) card.style.maxWidth = cfg.maxWidth;

    // Cabeçalho
    var head = el('div', 'jcm-head');
    var titles = el('div');
    var h = el('h2', 'jcm-title'); h.textContent = cfg.title || '';
    titles.appendChild(h);
    if (cfg.subtitle) { var sp = el('p', 'jcm-sub'); sp.textContent = cfg.subtitle; titles.appendChild(sp); }
    var x = el('button', 'jcm-x'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.innerHTML = '&times;';
    head.appendChild(titles); head.appendChild(x);

    // Formulário
    var form = el('form', 'jcm-form');
    var grid = el('div', 'jcm-grid');
    var refs = {};
    var hints = {};

    (cfg.fields || []).forEach(function (f) {
      if (f.type === 'hidden') { refs[f.id] = { value: f.value != null ? f.value : '' }; return; }
      if (f.type === 'section') { var sec = el('div', 'jcm-section'); sec.textContent = f.label || ''; grid.appendChild(sec); return; }
      var g = el('div', 'jcm-group' + (f.half ? '' : ' full'));
      if (f.label) {
        var lb = el('label'); lb.setAttribute('for', 'jcm-' + f.id);
        lb.innerHTML = esc(f.label) + (f.required ? ' <span class="req">*</span>' : '');
        g.appendChild(lb);
      }
      if (f.type === 'avatar') {
        g.classList.add('full');
        var av = el('div', 'jcm-avatar');
        var prev = el('div', 'jcm-avatar-prev');
        var hid = el('input'); hid.type = 'hidden';
        var personSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>';
        var setPrev = function (u) { if (u) { prev.style.backgroundImage = "url('" + u + "')"; prev.innerHTML = ''; } else { prev.style.backgroundImage = ''; prev.innerHTML = personSvg; } };
        var colb = el('div', 'jcm-avatar-btns');
        var pick = el('button', 'jcm-btn sec'); pick.type = 'button'; pick.textContent = 'Escolher foto';
        var rem = el('button', 'jcm-avatar-rem'); rem.type = 'button'; rem.textContent = 'Remover foto';
        var file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none';
        pick.addEventListener('click', function () { file.click(); });
        rem.addEventListener('click', function () { hid.value = ''; setPrev(''); });
        file.addEventListener('change', function () {
          var f0 = file.files && file.files[0]; if (!f0) return;
          downscaleImage(f0, 256, function (u) { hid.value = u; setPrev(u); });
        });
        setPrev(f.value || ''); hid.value = f.value || '';
        colb.appendChild(pick); colb.appendChild(rem);
        av.appendChild(prev); av.appendChild(colb); av.appendChild(file);
        g.appendChild(av); g.appendChild(hid);
        grid.appendChild(g);
        refs[f.id] = hid;
        return;
      }
      if (f.type === 'chips') {
        g.classList.add('full');
        var wrap = el('div', 'jcm-chips');
        var sel = (f.value && f.value.slice) ? f.value.slice() : [];
        (f.options || []).forEach(function (o) {
          var val = (typeof o === 'string') ? o : o.value;
          var lbl = (typeof o === 'string') ? o : (o.label != null ? o.label : o.value);
          var b = el('button', 'jcm-chip'); b.type = 'button';
          if (sel.indexOf(val) !== -1) b.classList.add('on');
          if (typeof o === 'object' && o.avatar) {
            var sp = el('span', 'jcm-chip-av');
            if (o.avatar.color) sp.style.background = o.avatar.color;
            sp.textContent = o.avatar.initials || '';
            b.appendChild(sp);
          }
          b.appendChild(document.createTextNode(lbl));
          b.addEventListener('click', function () {
            var i = sel.indexOf(val);
            if (i === -1) { sel.push(val); b.classList.add('on'); }
            else { sel.splice(i, 1); b.classList.remove('on'); }
          });
          wrap.appendChild(b);
        });
        g.appendChild(wrap);
        grid.appendChild(g);
        refs[f.id] = { get value() { return sel.slice(); } };
        return;
      }
      if (f.type === 'tags') {
        g.classList.add('full');
        var tags = (f.value && f.value.slice) ? f.value.slice() : [];
        var addRow = el('div', 'jcm-tagadd');
        var ti = el('input', 'jcm-field'); ti.type = 'text'; if (f.placeholder) ti.placeholder = f.placeholder;
        var addBtn = el('button', 'jcm-btn sec'); addBtn.type = 'button'; addBtn.textContent = f.addText || 'Adicionar';
        addRow.appendChild(ti); addRow.appendChild(addBtn);
        var list = el('div', 'jcm-tags');
        var renderTags = function () {
          list.innerHTML = '';
          tags.forEach(function (t, idx) {
            var chip = el('span', 'jcm-tag'); chip.appendChild(document.createTextNode(t));
            var rm = el('button'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remover'); rm.innerHTML = '&times;';
            rm.addEventListener('click', function () { tags.splice(idx, 1); renderTags(); });
            chip.appendChild(rm); list.appendChild(chip);
          });
        };
        var addTag = function () { var v = ti.value.trim(); if (!v) return; if (tags.indexOf(v) === -1) tags.push(v); ti.value = ''; renderTags(); ti.focus(); };
        addBtn.addEventListener('click', addTag);
        ti.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
        renderTags();
        g.appendChild(addRow); g.appendChild(list);
        grid.appendChild(g);
        refs[f.id] = { get value() { return tags.slice(); } };
        return;
      }
      var input;
      if (f.type === 'select') {
        input = el('select', 'jcm-field');
        (f.options || []).forEach(function (o) {
          var op = el('option');
          if (typeof o === 'string') { op.value = o; op.textContent = o; }
          else { op.value = o.value; op.textContent = o.label != null ? o.label : o.value; }
          input.appendChild(op);
        });
      } else if (f.type === 'textarea') {
        input = el('textarea', 'jcm-field');
        if (f.rows) input.rows = f.rows;
      } else if (f.type === 'range') {
        input = el('input', 'jcm-field jcm-range');
        input.type = 'range';
        input.min = f.min != null ? f.min : 0;
        input.max = f.max != null ? f.max : 100;
        input.step = f.step || 1;
        var lbEl = g.querySelector('label');
        if (lbEl) {
          var badge = el('span', 'jcm-range-val');
          lbEl.appendChild(badge);
          var sfx = f.suffix || '';
          var upd = function () { badge.textContent = ' ' + input.value + sfx; };
          input.addEventListener('input', upd);
          setTimeout(upd, 0);
        }
      } else {
        input = el('input', 'jcm-field');
        input.type = f.type || 'text';
        if (f.step) input.step = f.step;
        if (f.min != null) input.min = f.min;
        if (f.inputmode) input.setAttribute('inputmode', f.inputmode);
        if (f.list && f.list.length) {
          var dl = el('datalist'); dl.id = 'jcm-dl-' + f.id;
          f.list.forEach(function (v) { var o = el('option'); o.value = v; dl.appendChild(o); });
          input.setAttribute('list', dl.id); g.appendChild(dl);
        }
      }
      input.id = 'jcm-' + f.id;
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.value != null) input.value = f.value;
      g.appendChild(input);
      var hintEl = el('small', 'jcm-hint');
      if (f.hint) hintEl.textContent = f.hint;
      g.appendChild(hintEl);
      grid.appendChild(g);
      refs[f.id] = input;
      hints[f.id] = hintEl;
    });

    var err = el('p', 'jcm-error');

    // Rodapé
    var foot = el('div', 'jcm-foot');
    var bSec = el('button', 'jcm-btn sec'); bSec.type = 'button'; bSec.textContent = cfg.cancelText || 'Cancelar';
    var bPri = el('button', 'jcm-btn pri'); bPri.type = 'submit';
    bPri.innerHTML = '<span class="jcm-spin"></span><span class="jcm-label">' + esc(cfg.submitText || 'Salvar') + '</span>';
    foot.appendChild(bSec); foot.appendChild(bPri);

    form.appendChild(grid); form.appendChild(err); form.appendChild(foot);
    card.appendChild(head); card.appendChild(form);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.body.classList.add('jcm-open');

    // Controle exposto ao onSubmit
    var ctrl = {
      overlay: overlay, el: card,
      values: function () { var o = {}; Object.keys(refs).forEach(function (k) { o[k] = refs[k].value; }); return o; },
      get: function (id) { return refs[id] ? refs[id].value : undefined; },
      input: function (id) { var r = refs[id]; return (r && r.tagName) ? r : null; },
      setHint: function (id, t) { if (hints[id]) hints[id].textContent = t || ''; },
      setError: function (m) { err.textContent = m || ''; },
      setLoading: function (on) { bPri.classList.toggle('loading', !!on); bPri.disabled = !!on; bSec.disabled = !!on; },
      close: close,
      onKey: function (e) { if (e.key === 'Escape') close(); }
    };

    // Eventos
    x.addEventListener('click', close);
    bSec.addEventListener('click', function () { if (typeof cfg.onCancel === 'function') cfg.onCancel(); close(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', ctrl.onKey);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      ctrl.setError('');
      // validação de obrigatórios
      var faltou = (cfg.fields || []).find(function (f) {
        return f.required && f.type !== 'hidden' && !String(refs[f.id].value || '').trim();
      });
      if (faltou) { ctrl.setError('Preencha: ' + (faltou.label || faltou.id) + '.'); try { refs[faltou.id].focus(); } catch (_) {} return; }

      if (typeof cfg.onSubmit === 'function') {
        ctrl.setLoading(true);
        try {
          var r = await cfg.onSubmit(ctrl.values(), ctrl);
          ctrl.setLoading(false);
          if (r !== false && !cfg.keepOpen) close();
        } catch (ex) {
          ctrl.setLoading(false);
          ctrl.setError(ex && ex.message ? ex.message : 'Não foi possível salvar.');
        }
      } else { close(); }
    });

    aberto = ctrl;
    if (typeof cfg.onReady === 'function') { try { cfg.onReady(ctrl); } catch (_) {} }
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    setTimeout(function () { var first = card.querySelector('.jcm-field'); try { first && first.focus(); } catch (_) {} }, 80);
    return ctrl;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  window.JC.modal = { open: open, close: close };
})();