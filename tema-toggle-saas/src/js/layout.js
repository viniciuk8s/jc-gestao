/* ============================================================
   layout.js — Componente único de navegação (sidebar + topbar)
   Injeta o mesmo sidebar em todas as páginas, evitando repetição.
   A página indica a seção atual com <body data-page="...">.
   Deve carregar ANTES de sidebar.js e dropdown.js, e DEPOIS de
   supabase.js (precisa do window.SB para ler o usuário logado).
   ============================================================ */
'use strict';

(function () {
  // Tema salvo (claro/escuro) aplicado o quanto antes p/ minimizar flash
  try {
    var _t = localStorage.getItem('jc_theme');
    if (_t === 'light' || _t === 'dark') document.documentElement.setAttribute('data-theme', _t);
  } catch (e) {}

  // Evita injeção dupla
  if (document.getElementById('sidebar')) return;

  var LAYOUT = `
  <header class="app-header">
    <button class="menu-btn" onclick="openSidebar(this)" aria-label="Abrir menu">
      <i class="bi bi-list"></i>
    </button>
    <div class="mobile-logo">
      <img src="src/img/icone-laranja.png" alt="">
      <span class="logo-title">JC Elétrica &amp; Solar</span>
    </div>
    <span id="clock" class="header-clock"></span>

    <div class="header-grow"></div>

    <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" aria-label="Alternar tema claro/escuro" title="Alternar tema">
      <i class="bi bi-moon-stars theme-ico-dark" aria-hidden="true"></i>
      <i class="bi bi-sun theme-ico-light" aria-hidden="true"></i>
    </button>

    <div class="profile-wrap">
      <div class="profile-btn" id="profileBtn" onclick="toggleDropdown(this)">
        <div class="avatar">··</div>
        <div class="profile-meta">
          <span class="profile-name">Carregando…</span>
          <span class="profile-role"></span>
        </div>
        <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div class="dropdown" id="dropdown">
        <div class="dd-body">
          <button class="dd-item" id="dd-perfil">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Meu Perfil
          </button>
          <div class="dd-sep"></div>
          <button class="dd-item logout" id="dd-logout">
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
  </header>

  <div id="overlay" class="overlay" onclick="closeSidebar(this)"></div>

  <aside id="sidebar" class="sidebar">

    <!-- Marca -->
    <div class="sidebar-brand">
      <span class="brand-mark"><img src="src/img/icone-laranja.png" alt="JC"></span>
      <div class="brand-texts">
        <strong class="brand-name">JC Elétrica &amp; Solar</strong>
        <span class="brand-sub">Painel de Gestão</span>
      </div>
      <button onclick="closeSidebar()" class="close-btn" aria-label="Fechar menu">
        <i class="ti ti-x"></i>
      </button>
    </div>

    <!-- Navegação -->
    <nav class="sidebar-nav">
      <span class="nav-section-title">Geral</span>
      <a href="index.html" class="nav-item" data-nav="painel" onclick="setActive(this)">
        <span class="nav-icon"><i class="bi bi-grid"></i></span>
        <span class="nav-label">Painel</span>
      </a>

      <span class="nav-section-title">Módulos</span>
      <a href="fluxo-caixa.html" class="nav-item" data-nav="fluxo" onclick="setActive(this)">
        <span class="nav-icon"><i class="bi bi-repeat"></i></span>
        <span class="nav-label">Movimentações</span>
      </a>
      <a href="agendamento.html" class="nav-item" data-nav="agenda" onclick="setActive(this)">
        <span class="nav-icon"><i class="bi bi-clock"></i></span>
        <span class="nav-label">Agendamentos</span>
      </a>
      <a href="relatorios.html" class="nav-item" data-nav="relatorios" onclick="setActive(this)">
        <span class="nav-icon"><i class="bi bi-layers"></i></span>
        <span class="nav-label">Relatórios</span>
      </a>

      <span class="nav-section-title">Gestão</span>
      <a href="funcionarios.html" class="nav-item" data-nav="funcionarios" onclick="setActive(this)">
        <span class="nav-icon"><i class="bi bi-people"></i></span>
        <span class="nav-label">Colaboradores</span>
      </a>
      <a href="projetos.html" class="nav-item" data-nav="projetos" onclick="setActive(this)">
        <span class="nav-icon"><i class="bi bi-lightning-charge"></i></span>
        <span class="nav-label">Projetos</span>
      </a>
    </nav>

    <!-- Rodapé: recolher (desktop) -->
    <div class="sidebar-footer">
      <button onclick="toggleCollapse()" class="collapse-btn" aria-label="Recolher menu">
        <i id="btn-icon-collapse" class="ti ti-layout-sidebar-left-collapse"></i>
        <span class="collapse-label">Recolher</span>
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

  // Relógio
  function tickClock() {
    var el = document.getElementById('clock');
    if (!el) return;
    var n = new Date();
    el.textContent = n.toLocaleDateString('pt-BR') + ' - ' + n.toLocaleTimeString('pt-BR');
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ===================== Usuário logado + perfil ===================== */

  function setText(sel, txt) {
    var el = document.querySelector(sel);
    if (el) el.textContent = txt;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function nomeBonito(s) {
    return String(s).replace(/[._]+/g, ' ').split(/\s+/)
      .map(function (w) { return w ? w[0].toUpperCase() + w.slice(1) : w; }).join(' ');
  }
  function iniciais(nome) {
    var p = String(nome).trim().split(/\s+/);
    var s = p.length >= 2 ? (p[0][0] + p[1][0]) : String(nome).slice(0, 2);
    return s.toUpperCase();
  }

  // Aplica a imagem do usuario no .avatar (fallback: iniciais)
  function aplicarAvatar(url, nome) {
    var avs = document.querySelectorAll('.avatar'); // sidebar + dropdown + onde houver
    avs.forEach(function (av) {
      if (url) {
        av.style.backgroundImage = "url('" + url + "')";
        av.style.backgroundSize = 'cover';
        av.style.backgroundPosition = 'center';
        av.textContent = '';
        av.classList.add('has-img');
      } else {
        av.style.backgroundImage = '';
        av.textContent = iniciais(nome || '');
        av.classList.remove('has-img');
      }
    });
  }

  // Envia a imagem para o Storage do Supabase (bucket "avatars") e devolve a URL publica
  async function uploadAvatar(user, file) {
    var path = user.id + '/avatar';
    var up = await window.SB.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) throw up.error;
    var pub = window.SB.storage.from('avatars').getPublicUrl(path);
    return pub.data.publicUrl + '?v=' + Date.now(); // cache-busting
  }

  async function pegarUsuario() {
    if (!window.SB) return null;
    var r = await window.SB.auth.getSession();
    return (r && r.data && r.data.session) ? r.data.session.user : null;
  }

  async function carregarUsuario() {
    var user = await pegarUsuario();
    if (!user) { window.location.replace('login.html'); return; } // protege a página
    var meta = user.user_metadata || {};
    var appMeta = user.app_metadata || {};
    var nome = meta.full_name || meta.name || (user.email ? nomeBonito(user.email.split('@')[0]) : 'Usuário');
    // Cargo exibido = cargo da conta vinculada (derivado do papel), com override opcional em user_metadata.cargo
    var CARGOS = { admin: 'Administrador', viewer: 'Visualização' };
    var cargo = meta.cargo || CARGOS[appMeta.role] || appMeta.role || 'Colaborador';

    setText('.profile-name', nome);
    setText('.profile-role', cargo);
    aplicarAvatar(meta.avatar_url, nome);

    // Saudação do painel (se a página tiver o título de boas-vindas)
    var gt = document.getElementById('greet-title');
    if (gt) {
      var hh = new Date().getHours();
      var saud = hh < 12 ? 'Bom dia' : (hh < 18 ? 'Boa tarde' : 'Boa noite');
      gt.textContent = saud + ', ' + nome;
    }

    boasVindas(nome);
  }

  // Boas-vindas: aparece uma vez por sessão (após o login), não a cada página
  function boasVindas(nome) {
    try {
      if (sessionStorage.getItem('jc_greeted')) return;
      sessionStorage.setItem('jc_greeted', '1');
    } catch (e) {}
    var t = document.createElement('div');
    t.className = 'jcui-welcome';
    t.textContent = 'Bem-vindo(a), ' + nome + '!';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 400);
    }, 3500);
  }

  /* ===================== Modal simples (autocontido) ===================== */

  function fecharModal() {
    var e = document.getElementById('jcui-overlay');
    if (e) e.remove();
  }
  function jcModal(titulo, corpoHTML) {
    fecharModal();
    var ov = document.createElement('div');
    ov.id = 'jcui-overlay';
    ov.className = 'jcui-overlay';
    ov.innerHTML =
      '<div class="jcui-modal" role="dialog" aria-modal="true">' +
        '<div class="jcui-modal-head"><strong>' + escapeHtml(titulo) + '</strong>' +
          '<button type="button" class="jcui-x" aria-label="Fechar">&times;</button></div>' +
        '<div class="jcui-modal-body">' + corpoHTML + '</div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) fecharModal(); });
    ov.querySelector('.jcui-x').addEventListener('click', fecharModal);
    return ov.querySelector('.jcui-modal');
  }

  // Meu Perfil — foto, nome de exibição
  window.jcPerfil = async function () {
    var user = await pegarUsuario();
    if (!user) return;
    var meta = user.user_metadata || {};
    var nome = meta.full_name || meta.name || '';
    var avatarUrl = meta.avatar_url || '';
    var ultimo = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : '\u2014';
    var avInner = avatarUrl
      ? '<img src="' + escapeHtml(avatarUrl) + '" alt="">'
      : '<span>' + escapeHtml(iniciais(nome || (user.email || 'U'))) + '</span>';
    var box = jcModal('Meu Perfil',
      '<div class="jcui-avwrap">' +
        '<div class="jcui-av" id="jcui-av">' + avInner + '</div>' +
        '<div>' +
          '<button type="button" class="jcui-upload" id="jcui-av-btn">Trocar foto</button>' +
          '<p class="jcui-hint">PNG ou JPG, de preferência quadrada.</p>' +
        '</div>' +
        '<input type="file" id="jcui-av-file" accept="image/*" hidden>' +
      '</div>' +
      '<label class="jcui-l">Nome de exibição</label>' +
      '<input id="jcui-nome" class="jcui-i" value="' + escapeHtml(nome) + '" placeholder="Seu nome">' +
      '<label class="jcui-l">E-mail</label>' +
      '<input class="jcui-i" value="' + escapeHtml(user.email || '') + '" disabled>' +
      '<label class="jcui-l">Último acesso</label>' +
      '<input class="jcui-i" value="' + escapeHtml(ultimo) + '" disabled>' +
      '<p class="jcui-msg" id="jcui-perfil-msg"></p>' +
      '<button id="jcui-perfil-save" class="jcui-btn">Salvar</button>');

    var fileInput = box.querySelector('#jcui-av-file');
    var avBox = box.querySelector('#jcui-av');
    var pendingFile = null;
    box.querySelector('#jcui-av-btn').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      pendingFile = f;
      avBox.innerHTML = '<img src="' + URL.createObjectURL(f) + '" alt="">';
    });

    box.querySelector('#jcui-perfil-save').addEventListener('click', async function () {
      var btn = this;
      var novo = box.querySelector('#jcui-nome').value.trim();
      var msg = box.querySelector('#jcui-perfil-msg');
      msg.style.color = '';
      btn.disabled = true;
      try {
        var dados = { full_name: novo };
        if (pendingFile) {
          msg.style.color = ''; msg.textContent = 'Enviando imagem\u2026';
          dados.avatar_url = await uploadAvatar(user, pendingFile);
        }
        var res = await window.SB.auth.updateUser({ data: dados });
        if (res.error) throw res.error;
        setText('.profile-name', novo || 'Usuário');
        aplicarAvatar(dados.avatar_url || avatarUrl, novo);
        msg.style.color = '#34D399';
        msg.textContent = 'Salvo!';
        setTimeout(fecharModal, 700);
      } catch (e) {
        msg.style.color = '';
        msg.textContent = 'Erro: ' + (e && e.message ? e.message : 'falha ao salvar.');
      } finally {
        btn.disabled = false;
      }
    });
  };

  // Sair da conta
  async function fazerLogout() {
    try { await window.SB.auth.signOut(); } catch (e) {}
    try { sessionStorage.removeItem('jc_greeted'); } catch (e) {}
    window.location.replace('login.html');
  }
  window.logout = fazerLogout; // mantém compatibilidade com chamadas antigas

  window.toggleTheme = function () {
    var cur = document.documentElement.getAttribute('data-theme');
    var next = (cur === 'light') ? 'dark' : 'light';   // padrão (sem atributo) = escuro
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('jc_theme', next); } catch (e) {}
  };

  /* ===================== Estilos do modal/toast (uma vez) ===================== */
  if (!document.getElementById('jcui-style')) {
    var st = document.createElement('style');
    st.id = 'jcui-style';
    st.textContent =
      '.jcui-overlay{position:fixed;inset:0;background:rgba(6,13,22,.58);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}' +
      '.jcui-modal{background:rgba(16,26,40,.82);-webkit-backdrop-filter:blur(18px) saturate(135%);backdrop-filter:blur(18px) saturate(135%);width:100%;max-width:380px;border:1px solid rgba(255,255,255,.10);border-radius:18px;box-shadow:0 30px 80px -20px rgba(0,0,0,.65);overflow:hidden;color:#E8EDF5;font-family:inherit}' +
      '.jcui-modal-head{display:flex;align-items:center;justify-content:space-between;background:transparent;color:#F6F8FC;padding:16px 18px;font-size:15px;border-bottom:1px solid rgba(255,255,255,.08)}' +
      '.jcui-x{background:none;border:0;color:#9AA6BC;font-size:22px;line-height:1;cursor:pointer;padding:0 4px}' +
      '.jcui-x:hover{color:#fff}' +
      '.jcui-modal-body{padding:18px}' +
      '.jcui-l{display:block;font-size:12px;font-weight:600;color:#9AA6BC;margin:10px 0 4px}' +
      '.jcui-i{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid rgba(255,255,255,.13);border-radius:12px;font-size:14px;color:#E8EDF5;background:rgba(255,255,255,.06)}' +
      '.jcui-i::placeholder{color:rgba(154,166,188,.7)}' +
      '.jcui-i:focus{outline:none;border-color:#F97315;box-shadow:0 0 0 3px rgba(249,115,21,.25)}' +
      '.jcui-i:disabled{background:rgba(255,255,255,.04);color:#6E7A91}' +
      '.jcui-msg{min-height:18px;font-size:13px;color:#FF7A7A;margin:10px 0 0}' +
      '.jcui-btn{width:100%;margin-top:14px;padding:12px;border:0;border-radius:12px;background:linear-gradient(120deg,#F97315,#F97315 50%,#E8620A);color:#fff;font-size:14px;font-weight:700;cursor:pointer}' +
      '.jcui-btn:hover{filter:brightness(1.06)}' +
      '.jcui-avwrap{display:flex;align-items:center;gap:14px;margin-bottom:6px}' +
      '.jcui-av{width:64px;height:64px;border-radius:50%;overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(120deg,#F97315,#E8620A);color:#fff;font-weight:700;font-size:20px;border:1px solid rgba(255,255,255,.14)}' +
      '.jcui-av img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.jcui-upload{background:rgba(255,255,255,.08);color:#E8EDF5;border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer}' +
      '.jcui-upload:hover{background:rgba(255,255,255,.14)}' +
      '.jcui-hint{margin:6px 0 0;font-size:11.5px;color:#9AA6BC}' +
      '.jcui-welcome{position:fixed;top:18px;right:18px;background:rgba(16,26,40,.85);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.10);color:#F6F8FC;padding:12px 18px;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.45);font-family:inherit;font-size:14px;font-weight:600;z-index:10000;opacity:0;transform:translateY(-8px);transition:opacity .35s,transform .35s}' +
      '.jcui-welcome.show{opacity:1;transform:translateY(0)}';
    document.head.appendChild(st);
  }

  // Liga os botões do perfil DIRETAMENTE (imune a sobrescrita de funções globais)
  (function bindPerfil() {
    var b1 = document.getElementById('dd-perfil');
    var b3 = document.getElementById('dd-logout');
    if (b1) b1.addEventListener('click', function (e) { e.preventDefault(); window.jcPerfil(); });
    if (b3) b3.addEventListener('click', function (e) { e.preventDefault(); fazerLogout(); });
  })();

  // Dispara o carregamento do usuário
  carregarUsuario();
})();