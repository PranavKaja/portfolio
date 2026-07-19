// ============================================================
// Supabase connection, fill these in after creating your project.
//   Supabase Dashboard → Project Settings → API
//   • Project URL          -> SUPABASE_URL
//   • Project API keys: anon/public -> SUPABASE_ANON_KEY
//
// The anon key is SAFE to ship in the browser: Row Level Security
// (see supabase/schema.sql) is what actually protects writes.
//
// Leave these blank to run the site fully offline, it falls back to
// data/projects.json so everything still renders without a backend.
// ============================================================
window.PORTFOLIO_CONFIG = {
  SUPABASE_URL: "https://jjwndqrgejtueeyllqiw.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f2DN0Pz4rzVQPPSZjcbOyw_l8DyycYK"
};

// Returns a configured Supabase client, or null when offline / unconfigured.
window.getSupabase = function () {
  const cfg = window.PORTFOLIO_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;      // offline mode
  if (!window.supabase || !window.supabase.createClient) return null; // CDN didn't load
  if (!window.__sb) {
    try {
      window.__sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn('Supabase createClient failed (e.g. localStorage blocked in Incognito):', e);
      return null;
    }
  }
  return window.__sb;
};
