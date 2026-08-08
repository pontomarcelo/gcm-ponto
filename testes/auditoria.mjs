import { calcularCompetencia, duracaoHoras, somarDias, diasDeVirada, alertaExtras,
  TIPOS, tipoPorId, horasCurto, competenciaDe, estatisticas, faixaHoraria,
  CARGA_MENSAL, LIMITE_EXTRA } from '../src/services/calc.js';

let ok = 0, falhou = 0;
const t = (nome, real, esperado) => {
  const bom = JSON.stringify(real) === JSON.stringify(esperado);
  bom ? ok++ : falhou++;
  console.log(`${bom ? '  ok ' : 'FALHA'} │ ${nome.padEnd(52)} ${bom ? '' : `→ ${JSON.stringify(real)} (esperado ${JSON.stringify(esperado)})`}`);
};
const L = (o) => ({ dataSaida: o.data, tipo: 'ordinaria', ...o });

console.log('\n── DURAÇÃO ──────────────────────────────────────────────────');
t('mesmo dia 07:00→13:00', duracaoHoras('07:00','13:00','2026-08-10','2026-08-10'), 6);
t('vira a noite 18:00→02:00', duracaoHoras('18:00','02:00','2026-08-10','2026-08-11'), 8);
t('turno de 24h 07:00→07:00', duracaoHoras('07:00','07:00','2026-08-10','2026-08-11'), 24);
t('saída antes da entrada = inválido', duracaoHoras('18:00','16:00','2026-08-10','2026-08-10'), 0);
t('minutos quebrados 07:15→13:45', duracaoHoras('07:15','13:45','2026-08-10','2026-08-10'), 6.5);
t('registro antigo sem dataSaida', duracaoHoras('18:00','02:00'), 8);
t('virada de mês 31/07→01/08', duracaoHoras('19:00','07:00','2026-07-31','2026-08-01'), 12);
t('somarDias em ano bissexto', somarDias('2028-02-28',1), '2028-02-29');
t('somarDias virando o ano', somarDias('2026-12-31',1), '2027-01-01');

console.log('\n── REGRA DAS 135h ───────────────────────────────────────────');
{ const l=[]; for(let d=1;d<=19;d++) l.push(L({id:'a'+d,data:`2026-08-${String(d).padStart(2,'0')}`,entrada:'07:00',saida:'14:00'}));
  l.push(L({id:'x',data:'2026-08-20',entrada:'06:00',saida:'12:00'}));
  const r=calcularCompetencia(l), x=r.itens.find(i=>i.id==='x');
  t('divisão exata no cruzamento das 135h', [x.horasNormais,x.horasExtras], [2,4]);
  t('normais param em 135', r.totalNormais, 135);
  t('marcado como dividido', x.dividido, true); }

console.log('\n── EXTRA CONVOCADA ──────────────────────────────────────────');
{ const r=calcularCompetencia([
    L({id:'n',data:'2026-08-01',entrada:'07:00',saida:'14:00'}),
    L({id:'e',data:'2026-08-02',entrada:'08:00',saida:'18:00',tipo:'extra'})]);
  const e=r.itens.find(i=>i.id==='e');
  t('convocada não abate as 135h', e.horasNormais, 0);
  t('convocada é extra integral', e.horasExtras, 10);
  t('normais seguem só com escala Normal', r.totalNormais, 7);
  t('origem separada convocada/excedente', [r.extrasConvocadas,r.extrasExcedentes], [10,0]); }

console.log('\n── TETO DE 44h ──────────────────────────────────────────────');
{ const l=[]; for(let d=1;d<=5;d++) l.push(L({id:'e'+d,data:`2026-08-0${d}`,entrada:'07:00',saida:'17:00',tipo:'extra'}));
  const r=calcularCompetencia(l);
  t('extras somam além do teto (registro)', r.totalExtras, 50);
  t('excedente calculado', r.excedenteExtras, 6);
  t('restante zerado', r.restanteExtras, 0);
  t('último lançamento marcado como acima', r.itens[4].classe, 'over'); }

console.log('\n── DIÁRIA FORA DA FOLHA ─────────────────────────────────────');
{ const r=calcularCompetencia([
    L({id:'n',data:'2026-08-01',entrada:'07:00',saida:'14:00'}),
    L({id:'d',data:'2026-08-02',entrada:'08:00',saida:'17:00',tipo:'diaria'})]);
  t('diária não vira normal', r.itens.find(i=>i.id==='d').horasNormais, 0);
  t('diária não vira extra', r.itens.find(i=>i.id==='d').horasExtras, 0);
  t('diária somada à parte', r.totalDiarias, 9);
  t('folha ignora a diária', r.total, 7);
  t('mas o dia conta como trabalhado', r.diasTrabalhados, 2); }

console.log('\n── ATESTADO E LEGADO ────────────────────────────────────────');
{ const r=calcularCompetencia([L({id:'a',data:'2026-08-05',tipo:'atestado'})]);
  t('atestado não gera hora', r.total, 0);
  t('atestado não conta como dia trabalhado', r.diasTrabalhados, 0); }
t('tipo antigo "folga" ainda vale 0h', tipoPorId('folga').contaJornada, false);
t('tipo antigo "evento" reconhecido', tipoPorId('evento').nome, 'Evento');
t('tipo antigo "curso" fora da folha', tipoPorId('curso').contaJornada, false);
t('tipo desconhecido cai em Normal', tipoPorId('xpto').nome, 'Normal');

console.log('\n── ALERTAS ──────────────────────────────────────────────────');
t('20h sem alerta', alertaExtras(20), null);
t('30h avisa aproximação', alertaExtras(30).nivel, 'orange');
t('44h em vermelho', alertaExtras(44).nivel, 'red');
t('50h em vermelho', alertaExtras(50).nivel, 'red');

console.log('\n── ORDEM E RECÁLCULO ────────────────────────────────────────');
{ const base=[]; for(let d=1;d<=19;d++) base.push(L({id:'a'+d,data:`2026-08-${String(d).padStart(2,'0')}`,entrada:'07:00',saida:'14:00'}));
  base.push(L({id:'x',data:'2026-08-20',entrada:'06:00',saida:'12:00'}));
  const normal=calcularCompetencia(base);
  const embaralhado=calcularCompetencia([...base].reverse());
  t('ordem de entrada não muda o resultado', embaralhado.totalNormais, normal.totalNormais);
  const semUm=calcularCompetencia(base.filter(l=>l.id!=='a1'));
  t('excluir lançamento antigo recalcula o mês', semUm.totalExtras, 0); }

console.log('\n── DIVERSOS ─────────────────────────────────────────────────');
t('competência pela data de entrada', competenciaDe('2026-07-31'), '2026-07');
t('faixa mostra virada de dia', faixaHoraria({entrada:'07:00',saida:'07:00',data:'2026-08-01',dataSaida:'2026-08-02'}), '07:00 — 07:00 (+1d)');
t('mês vazio não quebra', calcularCompetencia([]).total, 0);
t('estatísticas de mês vazio', estatisticas(calcularCompetencia([])).media, 0);
t('tipos no formulário', TIPOS.map(x=>x.nome), ['Normal','Escala Extra','Diária','Atestado']);
t('constantes', [CARGA_MENSAL, LIMITE_EXTRA], [135, 44]);

console.log(`\n═══ ${ok} passaram · ${falhou} falharam ═══\n`);
process.exit(falhou ? 1 : 0);
