/**
 * GCM Ponto — Backup e restauração.
 *
 * Dois formatos, de propósito:
 *
 *  • .json  — só os lançamentos. Leve, cabe no WhatsApp, bom para o dia a dia.
 *  • .gcm   — tudo, inclusive as fotos e PDFs da gaveta. É um zip por dentro.
 *             É o que salva o guarda quando ele troca de celular.
 *
 * Nenhum dos dois depende de servidor. O arquivo é do guarda: ele guarda no
 * Drive, manda para o próprio e-mail ou joga num cartão de memória.
 */

import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import {
  exportarTudo, importarTudo, listarDocumentos, salvarDocumento, clear
} from './db.js';

/* ------------------------------------------------------ Backup leve (.json) */

export async function baixarBackup() {
  const dump = await exportarTudo();
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const nome = `gcm-ponto-backup_${new Date().toISOString().slice(0, 10)}.json`;
  return entregar(blob, nome, 'Backup do GCM Ponto');
}

/* ------------------------------------------ Backup completo (.gcm, com fotos) */

/** Nome de arquivo seguro para dentro do zip. */
const limparNome = (nome) =>
  (nome || 'arquivo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(0, 80);

export async function baixarBackupCompleto(aoProgredir) {
  aoProgredir?.('Reunindo os lançamentos…');
  const dump = await exportarTudo();
  const docs = await listarDocumentos();

  const pasta = {};
  const indice = [];

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    aoProgredir?.(`Empacotando arquivo ${i + 1} de ${docs.length}…`);
    const bytes = new Uint8Array(await d.blob.arrayBuffer());
    const caminho = `arquivos/${d.id}__${limparNome(d.nome)}`;
    pasta[caminho] = bytes;
    indice.push({
      id: d.id, nome: d.nome, tipo: d.tipo, tamanho: d.tamanho,
      competencia: d.competencia, data: d.data, criadoEm: d.criadoEm, caminho
    });
  }

  aoProgredir?.('Fechando o pacote…');
  pasta['dados.json'] = strToU8(JSON.stringify({ ...dump, formato: 'gcm-completo', documentos: indice }));
  pasta['LEIA-ME.txt'] = strToU8(
    'GCM Ponto - backup completo\n\n' +
    `Gerado em ${new Date().toLocaleString('pt-BR')}\n` +
    `Lancamentos: ${(dump.lancamentos || []).length}\n` +
    `Arquivos da gaveta: ${docs.length}\n\n` +
    'Para restaurar: abra o GCM Ponto no aparelho novo, va em\n' +
    'Ajustes > Restaurar backup e escolha este arquivo.\n\n' +
    'Guarde uma copia no Google Drive ou mande para o seu e-mail.\n'
  );

  // nível 6: o peso está nas fotos, que já vêm comprimidas — forçar não compensa
  const zip = zipSync(pasta, { level: 6 });
  const blob = new Blob([zip], { type: 'application/octet-stream' });
  const nome = `gcm-ponto-completo_${new Date().toISOString().slice(0, 10)}.gcm`;

  return entregar(blob, nome, 'Backup completo do GCM Ponto');
}

/* ------------------------------------------------------------ Restauração */

const lerTexto = (file) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(fr.result);
  fr.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
  fr.readAsText(file);
});

export function lerArquivoBackup(file) {
  return lerTexto(file).then((texto) => {
    try { return JSON.parse(texto); }
    catch { throw new Error('Arquivo inválido. Escolha um backup gerado pelo GCM Ponto.'); }
  });
}

/** Aceita os dois formatos e escolhe o caminho certo sozinho. */
export async function restaurarBackup(file, opcoes = {}, aoProgredir) {
  const nome = (file.name || '').toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ehZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // assinatura "PK"

  if (nome.endsWith('.gcm') || nome.endsWith('.zip') || ehZip) {
    return restaurarCompleto(bytes, opcoes, aoProgredir);
  }

  const dump = JSON.parse(strFromU8(bytes));
  const r = await importarTudo(dump, opcoes);
  return { ...r, documentos: 0 };
}

async function restaurarCompleto(bytes, opcoes, aoProgredir) {
  aoProgredir?.('Abrindo o pacote…');

  let conteudo;
  try {
    conteudo = unzipSync(bytes);
  } catch {
    throw new Error('Pacote corrompido. Tente outra cópia do backup.');
  }

  if (!conteudo['dados.json']) {
    throw new Error('Este arquivo não é um backup do GCM Ponto.');
  }

  const dump = JSON.parse(strFromU8(conteudo['dados.json']));
  aoProgredir?.('Restaurando os lançamentos…');
  const r = await importarTudo(dump, opcoes);

  if (opcoes.substituir) await clear('documentos');

  const indice = dump.documentos || [];
  let restaurados = 0;

  for (let i = 0; i < indice.length; i++) {
    const d = indice[i];
    const dados = conteudo[d.caminho];
    if (!dados) continue;
    aoProgredir?.(`Restaurando arquivo ${i + 1} de ${indice.length}…`);
    try {
      await salvarDocumento({
        id: d.id, nome: d.nome, tipo: d.tipo, tamanho: d.tamanho,
        competencia: d.competencia, data: d.data, criadoEm: d.criadoEm,
        blob: new Blob([dados], { type: d.tipo || 'application/octet-stream' })
      });
      restaurados++;
    } catch (e) {
      console.error('Falhou ao restaurar', d.nome, e);
    }
  }

  return { ...r, documentos: restaurados };
}

/* --------------------------------------------------------------- Entrega */

/** Compartilha se o aparelho souber; senão, baixa. */
async function entregar(blob, nome, titulo) {
  const file = new File([blob], nome, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titulo });
      return { nome, via: 'compartilhado' };
    } catch { /* cancelou: cai para download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 6000);
  return { nome, via: 'baixado' };
}
