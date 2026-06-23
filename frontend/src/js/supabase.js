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
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYnF2ZXh0c2ZsdHVmbXVnY3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODcyNTAsImV4cCI6MjA5NzM2MzI1MH0.I0dsIhUbi66MJJuuayftnyPdc5DRH9IixZ_pY5QLAuw';

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