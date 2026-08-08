/**
 * GCM Ponto — Motor de jornada.
 *
 * Regra da corporação:
 *  • Carga horária mensal: 135 horas, cumpridas SÓ com escala Normal.
 *  • Limite de hora extra: 44 horas.
 *
 * A hora extra vem de duas origens, e as duas somam no mesmo teto de 44h:
 *
 *  1. CONVOCADA — escala extra pedida pelo comando. É extra integral desde
 *     o primeiro minuto, mesmo com o mês em 20h. Nunca abate as 135h:
 *     serviço extra não substitui a carga regulamentar.
 *
 *  2. EXCEDENTE — a escala Normal que passa das 135h vira extra sozinha.
 *     Se um lançamento cruza a marca, ele é dividido: faltavam 2h e o
 *     guarda lançou 6h -> 2h normais + 4h extras.
 *
 * Diária não entra em nenhuma das duas contas: é paga à parte.
 *
 * O rateio segue a ordem cronológica (data + hora de entrada). Editar um
 * lançamento antigo recalcula o mês inteiro — é sempre o mês que manda,
 * nunca o lançamento isolado.
 */

export const CARGA_MENSAL = 135;
export const LIMITE_EXTRA = 44;
export const ALERTAS_EXTRA = [35, 40, 44];

/**
 * Cada tipo de escala pede campos diferentes. O formulário monta só o que
 * faz sentido para aquele serviço, em vez de repetir tudo para todos.
 *
 *  doisDias    — pode terminar no dia seguinte (turno de 24h, por exemplo)
 *  responsavel — rótulo do campo; null esconde o campo
 *  local / observacao / justificativa — exibe ou não
 */
/**
 * Cada tipo pede campos diferentes e nem todo tipo entra na folha.
 *
 *  temHorario   — tem entrada e saída, gerando duração
 *  contaJornada — entra no cálculo das 135h e das 44h extras
 *  doisDias     — pode terminar no dia seguinte
 *  responsavel  — rótulo do campo; null esconde o campo
 *
 * Só Normal e Escala Extra entram na folha. A Diária é registrada e vai no
 * relatório, mas é paga à parte: não abate as 135h nem consome as 44h.
 */
export const TIPOS = [
  {
    id: 'ordinaria', nome: 'Normal', temHorario: true, contaJornada: true, doisDias: true,
    responsavel: 'Comandante', local: false, observacao: false, justificativa: false
  },
  {
    id: 'extra', nome: 'Escala Extra', temHorario: true, contaJornada: true, convocada: true, doisDias: false,
    responsavel: 'Quem solicitou a extra', local: true, observacao: true, justificativa: true
  },
  {
    id: 'diaria', nome: 'Diária', temHorario: true, contaJornada: false, doisDias: false,
    responsavel: 'Quem pediu a diária', local: true, observacao: true, justificativa: true
  },
  {
    id: 'atestado', nome: 'Atestado', temHorario: false, contaJornada: false, doisDias: false,
    responsavel: null, local: false, observacao: true, justificativa: true
  }
];

/**
 * Tipos que saíram do formulário mas podem existir em registros antigos.
 * Não aparecem para escolher — servem para o app não recalcular errado
 * algo que já foi gravado.
 */
const TIPOS_ANTIGOS = [
  { id: 'evento', nome: 'Evento', temHorario: true, contaJornada: true, convocada: true, doisDias: true, responsavel: 'Quem solicitou', local: true, observacao: true, justificativa: true },
  { id: 'curso', nome: 'Curso', temHorario: true, contaJornada: false, doisDias: true, responsavel: 'Quem solicitou', local: true, observacao: true, justificativa: true },
  { id: 'folga', nome: 'Folga', temHorario: false, contaJornada: false, doisDias: false, responsavel: null, local: false, observacao: true, justificativa: false }
];

export const tipoPorId = (id) =>
  TIPOS.find((t) => t.id === id) || TIPOS_ANTIGOS.find((t) => t.id === id) || TIPOS[0];

/* ------------------------------------------------------------- Datas */

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/**
 * A competência da Guarda NÃO é o mês do calendário.
 *
 * Ela vai do dia 21 de um mês ao dia 20 do mês seguinte, e leva o nome do mês
 * em que TERMINA. Ou seja: 21/07 a 20/08 é a competência de Agosto de 2026.
 *
 * Consequência prática: um serviço lançado no dia 21 já pertence ao mês
 * seguinte. É o carimbo que manda, não o calendário na parede.
 */
export const DIA_VIRADA = 21;

const compISO = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}`;

const dataISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 'YYYY-MM-DD' -> competência 'YYYY-MM' pela regra 21→20. */
export const competenciaDe = (data) => {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-').map(Number);
  if (!ano || !mes || !dia) return (data || '').slice(0, 7);
  if (dia < DIA_VIRADA) return compISO(ano, mes);
  return mes === 12 ? compISO(ano + 1, 1) : compISO(ano, mes + 1);
};

export const hojeISO = () => dataISO(new Date());

export const competenciaAtual = () => competenciaDe(hojeISO());

/** Primeiro e último dia da competência: 21 do mês anterior a 20 deste. */
export function periodoDaCompetencia(comp) {
  const [ano, mes] = comp.split('-').map(Number);
  return {
    inicio: dataISO(new Date(ano, mes - 2, DIA_VIRADA)),
    fim: dataISO(new Date(ano, mes - 1, DIA_VIRADA - 1))
  };
}

/** Todos os dias da competência, em ordem — atravessa a virada do mês. */
export function diasDaCompetencia(comp) {
  const { inicio, fim } = periodoDaCompetencia(comp);
  const dias = [];
  let d = inicio;
  while (d <= fim) {
    dias.push(d);
    d = somarDias(d, 1);
  }
  return dias;
}

/** '21/07 a 20/08' — para o guarda saber que janela está vendo. */
export function periodoCurto(comp) {
  const { inicio, fim } = periodoDaCompetencia(comp);
  return `${inicio.slice(8, 10)}/${inicio.slice(5, 7)} a ${fim.slice(8, 10)}/${fim.slice(5, 7)}`;
}

export const nomeCompetencia = (comp) => {
  if (!comp) return '';
  const [ano, mes] = comp.split('-');
  return `${MESES[Number(mes) - 1]} de ${ano}`;
};

export const nomeCompetenciaCurto = (comp) => {
  if (!comp) return '';
  const [ano, mes] = comp.split('-');
  return `${MESES_CURTO[Number(mes) - 1]}/${ano.slice(2)}`;
};

/** Dia da semana de uma data ISO, sem cair na armadilha do fuso do Date(). */
export const diaSemana = (dataISO) => {
  const [a, m, d] = dataISO.split('-').map(Number);
  return new Date(a, m - 1, d).getDay();
};

export const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const [a, m, d] = dataISO.split('-');
  return `${d}/${m}/${a}`;
};

export const formatarDataExtenso = (dataISO) => {
  const [a, m, d] = dataISO.split('-').map(Number);
  return `${DIAS_SEMANA[diaSemana(dataISO)]}, ${String(d).padStart(2, '0')} de ${MESES[m - 1]} de ${a}`;
};

/* ------------------------------------------------------------- Horas */

/** 'HH:MM' -> minutos */
export const paraMinutos = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Duração em horas decimais.
 *
 * Com data de saída informada, a conta é exata: não há adivinhação.
 * Lançamentos antigos, gravados antes desse campo existir, caem na regra
 * anterior — se a saída é menor ou igual à entrada, presume-se madrugada.
 */
export function duracaoHoras(entrada, saida, dataEntrada = null, dataSaida = null) {
  if (!entrada || !saida) return 0;

  if (dataEntrada && dataSaida) {
    const ini = new Date(`${dataEntrada}T${entrada}:00`);
    const fim = new Date(`${dataSaida}T${saida}:00`);
    const min = (fim - ini) / 60000;
    return min > 0 ? Math.round((min / 60) * 100) / 100 : 0;
  }

  let min = paraMinutos(saida) - paraMinutos(entrada);
  if (min <= 0) min += 24 * 60;
  return Math.round((min / 60) * 100) / 100;
}

/** Soma dias a uma data ISO sem esbarrar no fuso horário. */
export function somarDias(dataISO, dias) {
  const [a, m, d] = dataISO.split('-').map(Number);
  const dt = new Date(a, m - 1, d + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Quantos dias o turno avança. 0 = mesmo dia, 1 = termina no dia seguinte. */
export function diasDeVirada(dataEntrada, dataSaida) {
  if (!dataEntrada || !dataSaida || dataEntrada === dataSaida) return 0;
  const [a1, m1, d1] = dataEntrada.split('-').map(Number);
  const [a2, m2, d2] = dataSaida.split('-').map(Number);
  return Math.round((new Date(a2, m2 - 1, d2) - new Date(a1, m1 - 1, d1)) / 86400000);
}

/** '07:00 — 07:00 (+1d)' para listas e relatório. */
export function faixaHoraria(l) {
  if (!l.entrada || !l.saida) return '—';
  const virada = l.dataSaida ? diasDeVirada(l.data, l.dataSaida) : 0;
  return `${l.entrada} — ${l.saida}${virada > 0 ? ` (+${virada}d)` : ''}`;
}

/** 7.5 -> '07:30' */
export function horasParaHHMM(horas) {
  const neg = horas < 0;
  const total = Math.round(Math.abs(horas) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${neg ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 7.5 -> '7h30' */
export function horasCurto(horas) {
  const total = Math.round(Math.abs(horas) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const sinal = horas < 0 ? '-' : '';
  return m === 0 ? `${sinal}${h}h` : `${sinal}${h}h${String(m).padStart(2, '0')}`;
}

const arred = (n) => Math.round(n * 100) / 100;

/* --------------------------------------------------- Rateio da competência */

/**
 * Recebe os lançamentos de UMA competência e devolve o rateio completo.
 * Cada lançamento sai enriquecido com: horas, horasNormais, horasExtras,
 * horasExcedentes (acima das 44h) e a classificação visual do dia.
 */
export function calcularCompetencia(lancamentos = []) {
  const ordenados = [...lancamentos].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    return paraMinutos(a.entrada) - paraMinutos(b.entrada);
  });

  let acumNormais = 0;
  let acumExtras = 0;

  let acumDiarias = 0;

  const itens = ordenados.map((l) => {
    const cfg = tipoPorId(l.tipo);
    const horas = cfg.temHorario ? duracaoHoras(l.entrada, l.saida, l.data, l.dataSaida) : 0;

    /* Diária é paga à parte: registra a hora, mas não mexe nas 135h nem nas 44h. */
    if (!cfg.contaJornada) {
      acumDiarias = arred(acumDiarias + horas);
      return {
        ...l,
        horas,
        horasNormais: 0, horasExtras: 0, horasExcedentes: 0,
        dividido: false, foraDaJornada: true,
        acumuladoNormais: acumNormais, acumuladoExtras: acumExtras,
        classe: horas > 0 ? 'fora' : 'folga'
      };
    }

    /* Extra convocada não abate a carga: é extra por inteiro.
       Escala Normal preenche as 135h e só o que sobra vira extra. */
    let horasNormais;
    if (cfg.convocada) {
      horasNormais = 0;
    } else {
      const espacoNormal = Math.max(0, CARGA_MENSAL - acumNormais);
      horasNormais = arred(Math.min(horas, espacoNormal));
    }
    const horasExtras = arred(horas - horasNormais);

    // Parte da extra que estoura o teto de 44h
    const espacoExtra = Math.max(0, LIMITE_EXTRA - acumExtras);
    const extrasDentro = arred(Math.min(horasExtras, espacoExtra));
    const horasExcedentes = arred(horasExtras - extrasDentro);

    acumNormais = arred(acumNormais + horasNormais);
    acumExtras = arred(acumExtras + horasExtras);

    let classe = 'folga';
    if (horas > 0) {
      if (horasExcedentes > 0) classe = 'over';
      else if (horasExtras > 0) classe = 'extra';
      else classe = 'normal';
    }

    return {
      ...l,
      horas,
      horasNormais,
      horasExtras,
      horasExcedentes,
      foraDaJornada: false,
      convocada: !!cfg.convocada,
      dividido: horasNormais > 0 && horasExtras > 0,
      acumuladoNormais: acumNormais,
      acumuladoExtras: acumExtras,
      classe
    };
  });

  const totalNormais = arred(acumNormais);
  const totalExtras = arred(acumExtras);
  const total = arred(totalNormais + totalExtras);
  const totalDiarias = arred(acumDiarias);
  const extrasConvocadas = arred(itens.filter((i) => i.convocada).reduce((t, i) => t + i.horasExtras, 0));
  const extrasExcedentes = arred(totalExtras - extrasConvocadas);
  const qtdDiarias = itens.filter((i) => i.foraDaJornada && i.horas > 0).length;
  const diasTrabalhados = new Set(itens.filter((i) => i.horas > 0).map((i) => i.data)).size;

  return {
    itens,
    totalNormais,
    totalExtras,
    total,
    totalDiarias,
    qtdDiarias,
    extrasConvocadas,
    extrasExcedentes,
    totalGeral: arred(total + totalDiarias),
    diasTrabalhados,
    restanteNormais: arred(Math.max(0, CARGA_MENSAL - totalNormais)),
    restanteExtras: arred(Math.max(0, LIMITE_EXTRA - totalExtras)),
    excedenteExtras: arred(Math.max(0, totalExtras - LIMITE_EXTRA)),
    percentualNormais: Math.min(100, Math.round((totalNormais / CARGA_MENSAL) * 100)),
    percentualExtras: Math.min(100, Math.round((totalExtras / LIMITE_EXTRA) * 100)),
    cumpriuCarga: totalNormais >= CARGA_MENSAL,
    estourouExtras: totalExtras > LIMITE_EXTRA
  };
}

/**
 * Simula o que aconteceria ao gravar um lançamento — usado na tela de
 * lançamento para mostrar a divisão antes de salvar.
 */
export function simular(lancamentosDaCompetencia, novo) {
  const semEle = lancamentosDaCompetencia.filter((l) => l.id !== novo.id);
  const antes = calcularCompetencia(semEle);
  const depois = calcularCompetencia([...semEle, novo]);
  const item = depois.itens.find((i) => i.id === novo.id);
  return { antes, depois, item };
}

/** Qual alerta de hora extra disparar no total atual. */
export function alertaExtras(totalExtras) {
  if (totalExtras > LIMITE_EXTRA) {
    return { nivel: 'red', titulo: 'Limite de hora extra ultrapassado',
      texto: `Você já registrou ${horasCurto(totalExtras)} de extra — ${horasCurto(totalExtras - LIMITE_EXTRA)} acima do teto de ${LIMITE_EXTRA}h.` };
  }
  if (totalExtras >= 44) {
    return { nivel: 'red', titulo: 'Teto de 44h atingido',
      texto: 'Você chegou ao limite mensal de hora extra. Novas escalas vão passar do teto.' };
  }
  if (totalExtras >= 40) {
    return { nivel: 'orange', titulo: '40 horas extras',
      texto: `Faltam ${horasCurto(LIMITE_EXTRA - totalExtras)} para o teto de 44h.` };
  }
  if (totalExtras >= 35) {
    return { nivel: 'orange', titulo: '35 horas extras',
      texto: `Faltam ${horasCurto(LIMITE_EXTRA - totalExtras)} para o teto de 44h.` };
  }
  if (totalExtras >= 30) {
    return { nivel: 'orange', titulo: 'Se aproximando do teto',
      texto: `${horasCurto(totalExtras)} de extra. Faltam ${horasCurto(LIMITE_EXTRA - totalExtras)} para as ${LIMITE_EXTRA}h.` };
  }
  return null;
}

/* ------------------------------------------------------------ Estatísticas */

export function estatisticas(resumo) {
  const comHoras = resumo.itens.filter((i) => i.horas > 0);
  if (!comHoras.length) {
    return { maior: null, menor: null, media: 0, porComandante: [], porTipo: [], porDiaSemana: Array(7).fill(0) };
  }

  const ordenadas = [...comHoras].sort((a, b) => b.horas - a.horas);
  const soma = comHoras.reduce((s, i) => s + i.horas, 0);

  const agrupar = (chave, rotulo) => {
    const mapa = new Map();
    comHoras.forEach((i) => {
      const k = (typeof chave === 'function' ? chave(i) : i[chave]) || '—';
      const atual = mapa.get(k) || { nome: rotulo ? rotulo(k) : k, horas: 0, dias: 0 };
      atual.horas = arred(atual.horas + i.horas);
      atual.dias += 1;
      mapa.set(k, atual);
    });
    return [...mapa.values()].sort((a, b) => b.horas - a.horas);
  };

  const porDiaSemana = Array(7).fill(0);
  comHoras.forEach((i) => { porDiaSemana[diaSemana(i.data)] = arred(porDiaSemana[diaSemana(i.data)] + i.horas); });

  return {
    maior: ordenadas[0],
    menor: ordenadas[ordenadas.length - 1],
    media: arred(soma / comHoras.length),
    porComandante: agrupar('comandante'),
    porLocal: agrupar('local'),
    porTipo: agrupar('tipo', (id) => tipoPorId(id).nome),
    porDiaSemana
  };
}

/**
 * Série diária de horas, para o gráfico do dashboard.
 * Vai do dia 21 ao dia 20, na ordem em que o guarda viveu o mês — por isso
 * é indexada pela data inteira, e não pelo número do dia.
 */
export function serieDiaria(resumo, competencia) {
  const serie = diasDaCompetencia(competencia).map((data) => ({
    data, dia: Number(data.slice(8, 10)), normais: 0, extras: 0
  }));
  const porData = new Map(serie.map((s) => [s.data, s]));
  resumo.itens.forEach((i) => {
    const s = porData.get(i.data);
    if (s) {
      s.normais = arred(s.normais + i.horasNormais);
      s.extras = arred(s.extras + i.horasExtras);
    }
  });
  return serie;
}

export const novoId = () =>
  `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
