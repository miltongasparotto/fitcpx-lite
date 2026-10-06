// CORS liberado pra qualquer origem — o app do aluno e o painel do trainer
// são sites estáticos (GitHub Pages/localhost), sem domínio fixo em dev.
// Autenticação real é feita pelo JWT do usuário, não pela origem da requisição.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
