// Inicialização do app.
renderObjGrid();
// Alunos salvos localmente (cache); o Supabase sobrescreve ao logar (supaCarregarDados).
try{
  const saved = localStorage.getItem(lsKey('acm-students'));
  if(saved){
    const parsed = JSON.parse(saved);
    if(Array.isArray(parsed) && parsed.length){
      students = parsed;
      activeId = null;
    }
  }
}catch(e){}
// Limpeza (2026-08-27): remove 3 alunos de demonstração antigos que ficaram no localStorage.
students = students.filter(s => ![1782498533431, 1782498535600, 1782498536358].includes(s.id));
try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
