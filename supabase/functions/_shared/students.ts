// Helpers pra ler/gravar o blob students[] (app_data.key='students') com a
// service_role key — só as Edge Functions têm esse acesso, nunca o cliente
// (aluno) direto, que é bloqueado pela RLS de app_data (RLS é do trainer).
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Extrai e valida o usuário chamador a partir do JWT do header Authorization
// (o supabase-js do navegador já manda isso sozinho em functions.invoke()).
export async function getCallerUser(admin: SupabaseClient, req: Request) {
  const auth = req.headers.get('Authorization') || '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user;
}

// Mesma garantia de js/ids.js novoId(): nunca repete, mesmo sem estado
// compartilhado entre chamadas (calcula a partir do maior id já usado).
export function novoId(existingIds: number[]): number {
  const max = existingIds.reduce((m, n) => (Number.isFinite(n) && n > m ? n : m), 0);
  const now = Date.now();
  return now > max ? now : max + 1;
}

// Gerador de ids que NÃO colide dentro da mesma execução — novoId() sozinho
// usa um snapshot fixo de ids existentes, então duas chamadas no mesmo
// milissegundo (comum: criar o student e, na sequência, criar a primeira
// avaliação dele) podiam devolver o mesmo valor. Isto mantém a lista viva.
export function criadorDeIds(existingIds: number[]) {
  const usados = [...existingIds];
  return () => {
    const id = novoId(usados);
    usados.push(id);
    return id;
  };
}

function coletarIdsProfundo(raiz: unknown): number[] {
  const achados: number[] = [];
  const CHAVES = ['id', 'arqId', 'idOriginal'];
  (function andar(v: unknown) {
    if (Array.isArray(v)) { v.forEach(andar); return; }
    if (v && typeof v === 'object') {
      for (const k of CHAVES) {
        const n = Number((v as Record<string, unknown>)[k]);
        if (Number.isFinite(n)) achados.push(n);
      }
      Object.values(v as Record<string, unknown>).forEach(andar);
    }
  })(raiz);
  return achados;
}

export async function loadStudents(admin: SupabaseClient, trainerUserId: string) {
  const { data, error } = await admin
    .from('app_data').select('data')
    .eq('user_id', trainerUserId).eq('key', 'students')
    .maybeSingle();
  if (error) throw error;
  const students = Array.isArray(data?.data) ? data.data : [];
  return { students, todosIds: coletarIdsProfundo(students) };
}

export async function saveStudents(admin: SupabaseClient, trainerUserId: string, students: unknown[]) {
  const { error } = await admin.from('app_data').upsert({
    user_id: trainerUserId, key: 'students', data: students, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export function findStudentByAlunoUserId(students: any[], alunoUserId: string) {
  return students.find((s) => s?.perfil?.alunoUserId === alunoUserId) || null;
}

export function findStudentByEmail(students: any[], email: string) {
  const alvo = (email || '').trim().toLowerCase();
  if (!alvo) return null;
  return students.find((s) => (s?.perfil?.email || '').trim().toLowerCase() === alvo) || null;
}

// Acha (ou cria) o student vinculado a `pessoa` (id/email) dentro do blob do
// trainer e garante os campos básicos de vínculo. Usado tanto pela aluno-api
// (o próprio aluno chamando) quanto pela trainer-transferencia (o trainer
// definindo senha/criando acesso pra um aluno que ele já cadastrou manual).
export async function garantirStudentNoBlob(
  admin: SupabaseClient, trainerId: string,
  pessoa: { id: string; email: string; user_metadata?: any },
  marcarNovoCadastro: boolean,
  confiarEmail = false,   // true = pode reaproveitar student existente só pelo e-mail (trainer chamando, ou e-mail verificado)
) {
  const { students, todosIds } = await loadStudents(admin, trainerId);
  let s = findStudentByAlunoUserId(students, pessoa.id) || (confiarEmail ? findStudentByEmail(students, pessoa.email) : null);
  if (!s) {
    s = { id: novoId(todosIds), perfil: {}, anamnese: {}, treinos: [], avaliacoesAntro: [], reavaliacao: null };
    students.push(s);
  }
  s.perfil.email = pessoa.email;
  s.perfil.alunoUserId = pessoa.id;
  s.perfil.nome = s.perfil.nome || pessoa.user_metadata?.nome || '';
  s.perfil.portalStatus = s.perfil.portalStatus || 'ativo';
  if (marcarNovoCadastro && !s.perfil.onboardingConcluido) s.perfil.novoCadastro = true;
  await saveStudents(admin, trainerId, students);
  return s;
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// ── Nível de treinamento — fórmula objetiva ──────────────────────────────────
// MESMA fórmula de js/avaliacao.js calcularNivelTreino() — mudar nos dois.
//   < 6 meses → Iniciante · 6 meses a 2 anos → Intermediário · 2 anos+ → Avançado
//   consistência "irregular" rebaixa um nível. Sem tempo → '' (não calcula).
const NIVEL_POR_TEMPO: Record<string, number> = {
  'Menos de 1 mês': 0, '1–3 meses': 0, '3–6 meses': 0,
  '6–12 meses': 1, '1–2 anos': 1,
  '2–4 anos': 2, 'Mais de 4 anos': 2,
};
export function calcularNivelTreino(tempo: string, consistencia: string): string {
  if (!(tempo in NIVEL_POR_TEMPO)) return '';
  let n = NIVEL_POR_TEMPO[tempo];
  if (consistencia === 'irregular') n = Math.max(0, n - 1);
  return ['Inic', 'Inte', 'Avan'][n];
}

// ── Saneamento de entrada (o aluno é fonte NÃO confiável) ───────────────────
// Tudo que o aluno manda acaba renderizado no painel do personal. A saída do
// painel escapa HTML, mas aqui a gente não grava lixo: tipo errado vira vazio,
// tamanho é limitado e abertura de tag HTML é neutralizada.
export function limpaTexto(v: unknown, max = 200): string {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/<(?=[a-zA-Z\/!?])/g, '‹')   // "<script", "</x", "<!--"; "<6 meses" passa
    .trim()
    .slice(0, max);
}
// Medida numérica (kg, cm, %): só dígitos com vírgula/ponto decimal.
export function limpaNumero(v: unknown): string {
  const s = typeof v === 'number' ? String(v) : (typeof v === 'string' ? v.trim() : '');
  return /^\d{1,4}([.,]\d{1,2})?$/.test(s) ? s : '';
}
export function limpaDataISO(v: unknown): string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
