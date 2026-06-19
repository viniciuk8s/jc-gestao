/* ============================================================
   utils.js — Funções utilitárias compartilhadas (namespace JC)

   Centraliza o que antes estava duplicado em fluxo.js, funcionarios.js,
   projetos.js, relatorios.js e calendario.js.

   Carregue ANTES dos scripts de página:
     <script src="src/js/utils.js"></script>
   ============================================================ */
(function (global) {
  'use strict';

  var AVATAR_COLORS = ['#2952E3', '#0E9F6E', '#7C3AED', '#D97706',
                       '#0891B2', '#E11D48', '#4F46E5', '#0D9488'];

  var MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                     'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* ---------- Texto / HTML ---------- */
  // Escapa para inserção segura via innerHTML (previne XSS).
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- Moeda ---------- */
  function brl(n) {
    return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /* ---------- Datas (entrada ISO "AAAA-MM-DD") ---------- */
  function fmtDate(d, empty) {            // -> "DD/MM/AAAA"
    if (!d) return empty == null ? '—' : empty;
    var p = String(d).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function fmtDateShort(d, empty) {       // -> "DD/MM"
    if (!d) return empty == null ? '' : empty;
    var p = String(d).split('-');
    return p[2] + '/' + p[1];
  }
  function fmtComp(c, empty) {            // competência "AAAA-MM" -> "mês/AAAA"
    if (!c) return empty == null ? '—' : empty;
    var p = String(c).split('-');
    return MESES_CURTO[Number(p[1]) - 1] + '/' + p[0];
  }

  /* ---------- Avatares ---------- */
  function initials(nome) {
    var parts = String(nome == null ? '' : nome).trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : '';
    var b = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (a + b).toUpperCase();
  }
  // Cor estável derivada do nome (mesmo nome -> mesma cor).
  function color(nome) {
    var s = String(nome == null ? '' : nome), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  /* ---------- Formulários ---------- */
  function val(id) {                      // value (trim) ou ''
    var el = document.getElementById(id);
    return el ? String(el.value).trim() : '';
  }
  function setVal(id, v) {                 // define value
    var el = document.getElementById(id);
    if (el) el.value = v;
  }
  function setText(id, txt) {              // define textContent
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  /* ---------- CSV ---------- */
  // Escapa um campo individual quando ele contém ; " ou quebra de linha.
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  // Recebe o nome do arquivo e as linhas já montadas (strings com ';').
  // Cuida do BOM (acentos no Excel), das quebras CRLF e do download.
  function saveCSV(filename, lines) {
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  global.JC = {
    AVATAR_COLORS: AVATAR_COLORS,
    esc: esc,
    brl: brl,
    fmtDate: fmtDate,
    fmtDateShort: fmtDateShort,
    fmtComp: fmtComp,
    initials: initials,
    color: color,
    val: val,
    setVal: setVal,
    setText: setText,
    csvCell: csvCell,
    saveCSV: saveCSV
  };
})(window);