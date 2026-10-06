// Substitui https://esm.sh/@supabase/supabase-js@2 nos testes em Node (ver trainer-transferencia.test.mts).
export const createClient = () => globalThis.__admin;
export class SupabaseClient {}
