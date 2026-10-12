// Variables de entorno de la plataforma (Vite las inyecta en build).
// Ver .env.example y el README para configurarlas en Vercel.

import { CONFIG } from '../config.js';

const env = import.meta.env;

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';
const haySupabase = Boolean(supabaseUrl && supabaseKey);

export const ENV = {
  supabaseUrl,
  supabaseKey,
  haySupabase,
  // Sin Supabase siempre es demo: todo vive en este navegador.
  demo: env.VITE_DEMO_MODE === 'true' || !haySupabase,
  adminPin: env.VITE_ADMIN_PIN || '2468',
  // 'simulado' o 'stripe'. En demo, simulado por defecto.
  pagos: env.VITE_PAGOS || (env.VITE_DEMO_MODE === 'true' || !haySupabase ? 'simulado' : 'stripe'),
  appsScriptUrl: env.VITE_APPS_SCRIPT_URL || CONFIG.appsScriptUrl || '',
};
