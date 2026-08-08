/**
 * GCM Ponto — Relatório mensal em PDF.
 * Layout de documento oficial: cabeçalho com brasão e identificação,
 * tabela de jornadas, resumo fechado e bloco de assinatura autenticada.
 */

import { jsPDF } from 'jspdf';
import autoTableRaw from 'jspdf-autotable';

// Compatibilidade entre bundler (ESM) e execução em Node (CJS interop).
const autoTable = typeof autoTableRaw === 'function' ? autoTableRaw : autoTableRaw.default;
import {
  CARGA_MENSAL, LIMITE_EXTRA, formatarData, horasParaHHMM, horasCurto,
  nomeCompetencia, tipoPorId, DIAS_SEMANA, diaSemana, faixaHoraria
} from './calc.js';

const NAVY = [11, 37, 69];
const GOLD = [176, 141, 30];
const GREEN = [8, 130, 78];
const ORANGE = [181, 71, 8];
const RED = [200, 40, 45];
const GRAY = [110, 122, 140];
const BLUE = [23, 92, 195];

/** Carrega uma imagem da pasta pública como dataURL (para o brasão). */
async function carregarImagem(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * @param {object} p
 * @param {object} p.perfil        nome, matricula, municipio, unidade
 * @param {string} p.competencia   'YYYY-MM'
 * @param {object} p.resumo        saída de calcularCompetencia()
 * @param {object|null} p.assinatura { metodo, selo, selfie, assinadoEm }
 * @returns {Promise<{blob: Blob, nomeArquivo: string, doc: jsPDF}>}
 */
export async function gerarRelatorioPDF({ perfil, competencia, resumo, assinatura = null, logoUrl = './logo/gcm-logo-pdf.png' }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 15;                        // margem esquerda
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const R = W - L;                     // margem direita

  /* ------------------------------------------------------------ Cabeçalho */
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 40, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 40, W, 1.4, 'F');

  // O brasão é mais alto que largo: a proporção é preservada para não achatar.
  const logo = await carregarImagem(logoUrl);
  const logoAlt = 28;
  const logoLarg = logoAlt * 0.89;
  if (logo) {
    try { doc.addImage(logo, 'PNG', L, 6.5, logoLarg, logoAlt); } catch { /* segue sem brasão */ }
  }

  const xTexto = logo ? L + logoLarg + 6 : L;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('GUARDA MUNICIPAL', xTexto, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(String(perfil?.municipio || '').toUpperCase(), xTexto, 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('RELATÓRIO MENSAL DE JORNADA', xTexto, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(nomeCompetencia(competencia).toUpperCase(), R, 30, { align: 'right' });

  /* ------------------------------------------------------- Identificação */
  let y = 51;
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('IDENTIFICAÇÃO DO AGENTE', L, y);
  y += 3;
  doc.setDrawColor(220, 226, 236);
  doc.line(L, y, R, y);
  y += 6;

  const campos = [
    ['Nome', perfil?.nome || '—'],
    ['Matrícula', perfil?.matricula || '—'],
    ['Município', perfil?.municipio || '—'],
    ['Unidade', perfil?.unidade || '—'],
    ['Competência', nomeCompetencia(competencia)]
  ];
  doc.setFontSize(9);
  campos.forEach(([k, v], i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const x = L + col * ((R - L) / 2);
    const yy = y + linha * 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`${k}:`, x, yy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(String(v), x + 24, yy);
  });
  y += Math.ceil(campos.length / 2) * 6.5 + 4;

  /* -------------------------------------------------------------- Tabela */
  const corpo = resumo.itens.map((i) => [
    `${formatarData(i.data)}\n${DIAS_SEMANA[diaSemana(i.data)]}`,
    i.horas > 0 ? faixaHoraria(i) : '—',
    tipoPorId(i.tipo).nome,
    i.comandante || '—',
    i.local || '—',
    i.horas > 0 && !i.foraDaJornada ? horasParaHHMM(i.horasNormais) : '—',
    i.horas > 0 && !i.foraDaJornada ? horasParaHHMM(i.horasExtras) : '—',
    i.horas > 0 ? horasParaHHMM(i.horas) : '—'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Horário', 'Tipo', 'Comandante / Solicitante', 'Local', 'Normais', 'Extras', 'Total']],
    body: corpo.length ? corpo : [['—', '—', '—', '—', '—', '—', '—', '—']],
    theme: 'grid',
    rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 7.6, cellPadding: 2, textColor: [30, 41, 59], lineColor: [225, 231, 240], lineWidth: 0.15 },
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 7.6, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const item = resumo.itens[d.row.index];
      if (!item) return;
      if (d.column.index === 6 && item.horasExtras > 0) d.cell.styles.textColor = item.horasExcedentes > 0 ? RED : ORANGE;
      if (d.column.index === 5 && item.horasNormais > 0) d.cell.styles.textColor = GREEN;
      // Diária aparece na tabela, mas em azul, para não ser confundida com folha
      if (item.foraDaJornada && item.horas > 0 && [2, 7].includes(d.column.index)) d.cell.styles.textColor = BLUE;
    },
    margin: { left: L, right: L }
  });

  y = doc.lastAutoTable.finalY + 9;

  /* ------------------------------------------- Detalhamento das escalas */
  /* Justificativa e observação não cabem na tabela sem espremer tudo, então
     saem em bloco próprio — é o que o comando precisa ler com atenção. */
  const comDetalhe = resumo.itens.filter((i) => i.justificativa || i.observacao);

  if (comDetalhe.length) {
    if (y > H - 60) { doc.addPage(); y = 20; }

    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DETALHAMENTO DAS ESCALAS', L, y);
    y += 3;
    doc.setDrawColor(220, 226, 236);
    doc.line(L, y, R, y);
    y += 7;

    comDetalhe.forEach((i) => {
      const cfg = tipoPorId(i.tipo);
      const linhas = [];
      if (i.comandante) linhas.push([`${cfg.responsavel || 'Responsável'}:`, i.comandante]);
      if (i.local) linhas.push(['Local:', i.local]);
      if (i.justificativa) linhas.push(['Justificativa:', i.justificativa]);
      if (i.observacao) linhas.push(['Observação:', i.observacao]);

      // A coluna do valor começa depois do rótulo mais largo do bloco,
      // senão "Quem solicitou a extra:" invade o texto ao lado.
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      const larguraRotulo = Math.max(...linhas.map(([rot]) => doc.getTextWidth(rot))) + 3;
      const xValor = L + 3 + larguraRotulo;

      // mede a altura antes de desenhar, para não cortar o bloco entre páginas
      let altura = 7;
      const medidas = linhas.map(([rot, txt]) => {
        const quebrado = doc.splitTextToSize(txt, R - xValor - 4);
        altura += quebrado.length * 4;
        return [rot, quebrado];
      });

      if (y + altura > H - 22) { doc.addPage(); y = 20; }

      doc.setFillColor(248, 250, 253);
      doc.setDrawColor(228, 234, 243);
      doc.roundedRect(L, y - 4, R - L, altura, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      doc.text(`${formatarData(i.data)} · ${cfg.nome} · ${faixaHoraria(i)}`, L + 3, y + 1);

      let yy = y + 6;
      medidas.forEach(([rot, quebrado]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.setTextColor(...GRAY);
        doc.text(rot, L + 3, yy);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(45, 58, 78);
        quebrado.forEach((linha, k) => doc.text(linha, xValor, yy + k * 4));
        yy += quebrado.length * 4;
      });

      y += altura + 3;
    });

    y += 5;
  }

  /* -------------------------------------------------------------- Resumo */
  if (y > H - 78) { doc.addPage(); y = 20; }

  doc.setFillColor(247, 249, 252);
  doc.setDrawColor(225, 231, 240);
  doc.roundedRect(L, y, R - L, 34, 2.5, 2.5, 'FD');

  const blocos = [
    ['HORAS NORMAIS', horasParaHHMM(resumo.totalNormais), `de ${CARGA_MENSAL}:00`, GREEN],
    ['HORAS EXTRAS', horasParaHHMM(resumo.totalExtras), `de ${LIMITE_EXTRA}:00`, resumo.estourouExtras ? RED : ORANGE],
    ['TOTAL NA FOLHA', horasParaHHMM(resumo.total), 'normais + extras', NAVY],
    ['DIAS TRABALHADOS', String(resumo.diasTrabalhados), 'registros', NAVY]
  ];
  if (resumo.totalDiarias > 0) {
    blocos.splice(2, 0, ['DIÁRIAS', horasParaHHMM(resumo.totalDiarias), 'fora da folha', BLUE]);
  }
  const larg = (R - L) / blocos.length;
  blocos.forEach(([rot, val, sub, cor], i) => {
    const cx = L + larg * i + larg / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...GRAY);
    doc.text(rot, cx, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...cor);
    doc.text(val, cx, y + 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...GRAY);
    doc.text(sub, cx, y + 25.5, { align: 'center' });
    if (i < blocos.length - 1) {
      doc.setDrawColor(225, 231, 240);
      doc.line(L + larg * (i + 1), y + 5, L + larg * (i + 1), y + 29);
    }
  });
  y += 38;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...GRAY);
  const notas = ['Entram no cálculo da folha apenas as escalas Normal e Extra. Diárias são registradas para controle e pagas à parte.'];
  if (resumo.totalExtras > 0) {
    notas.push(
      `Das ${horasParaHHMM(resumo.totalExtras)} de hora extra, ${horasParaHHMM(resumo.extrasConvocadas)} foram convocadas pelo comando `
      + `e ${horasParaHHMM(resumo.extrasExcedentes)} decorrem da escala normal acima das ${CARGA_MENSAL} horas. `
      + `A escala extra convocada não abate a carga regulamentar.`
    );
  }
  notas.forEach((nota) => {
    doc.splitTextToSize(nota, R - L).forEach((linha) => { doc.text(linha, L, y); y += 3.4; });
  });
  y += 4;

  if (resumo.estourouExtras) {
    doc.setFillColor(253, 236, 236);
    doc.setDrawColor(240, 190, 190);
    doc.roundedRect(L, y, R - L, 10, 2, 2, 'FD');
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Atenção: ${horasCurto(resumo.excedenteExtras)} acima do limite mensal de ${LIMITE_EXTRA} horas extras.`, L + 4, y + 6.4);
    y += 15;
  }

  /* ---------------------------------------------------------- Assinatura */
  if (y > H - 66) { doc.addPage(); y = 20; }

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('AUTENTICAÇÃO', L, y);
  y += 3;
  doc.setDrawColor(220, 226, 236);
  doc.line(L, y, R, y);
  y += 8;

  if (assinatura) {
    const metodos = { pin: 'PIN pessoal de 6 dígitos', selfie: 'Reconhecimento por selfie', biometria: 'Biometria do aparelho' };
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 52, 70);
    doc.text(`Documento autenticado por ${metodos[assinatura.metodo] || assinatura.metodo}.`, L, y);
    doc.text(`Data da autenticação: ${new Date(assinatura.assinadoEm).toLocaleString('pt-BR')}`, L, y + 5.5);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...GOLD);
    doc.text(`Código: ${assinatura.selo}`, L, y + 11.5);
    doc.setFont('helvetica', 'normal');

    if (assinatura.selfie) {
      try {
        doc.addImage(assinatura.selfie, 'JPEG', R - 32, y - 4, 30, 30);
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(0.3);
        doc.rect(R - 32, y - 4, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.4);
        doc.setTextColor(...GRAY);
        doc.text('Registro fotográfico', R - 17, y + 29, { align: 'center' });
      } catch { /* segue sem foto */ }
    }
    y += 34;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text('Relatório não autenticado. Assine no aplicativo antes de enviar ao comando.', L, y);
    y += 12;
  }

  y = Math.max(y, H - 42);
  doc.setDrawColor(120, 132, 150);
  doc.setLineWidth(0.3);
  doc.line(L + 12, y, L + 82, y);
  doc.line(R - 82, y, R - 12, y);
  doc.setFontSize(7.6);
  doc.setTextColor(...GRAY);
  doc.text(perfil?.nome || 'Agente', L + 47, y + 4.5, { align: 'center' });
  doc.text(`Matrícula ${perfil?.matricula || '—'}`, L + 47, y + 8.5, { align: 'center' });
  doc.text('Comando da Guarda Municipal', R - 47, y + 4.5, { align: 'center' });
  doc.text('Visto', R - 47, y + 8.5, { align: 'center' });

  /* -------------------------------------------------------------- Rodapé */
  const paginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(225, 231, 240);
    doc.setLineWidth(0.2);
    doc.line(L, H - 14, R, H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`GCM Ponto · Controle Inteligente de Jornada · emitido em ${new Date().toLocaleString('pt-BR')}`, L, H - 9);
    doc.text(`Página ${p} de ${paginas}`, R, H - 9, { align: 'right' });
  }

  const slug = (perfil?.nome || 'guarda').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const nomeArquivo = `gcm-ponto_${slug}_${competencia}.pdf`;

  return { blob: doc.output('blob'), nomeArquivo, doc };
}
