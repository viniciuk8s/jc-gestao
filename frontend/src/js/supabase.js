/* ============================================================
   supabase.js — Cliente Supabase compartilhado (todas as páginas)
   ------------------------------------------------------------
   COMO CONFIGURAR:
   1. Crie um projeto em https://supabase.com
   2. No painel: Project Settings > API
   3. Copie a "Project URL" e a "anon public" key e cole abaixo.

   Obs.: a anon key PODE ficar exposta no front-end. Quem protege
   os dados é o Row Level Security (RLS) ativado nas tabelas.
   ============================================================ */

const SUPABASE_URL = 'https://mabqvextsfltufmugcvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oQZtZpJ5P-3x6vZ_-BcPKw_RbQsOwqf';

if (!window.supabase) {
  console.error('Supabase não carregou. Verifique a tag <script> do CDN.');
} else {
  window.SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}