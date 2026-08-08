/**
 * GCM Ponto — Sincronização pelo Google Drive.
 *
 * O app não tem servidor, e não vai ter. Quem guarda a cópia comum é o Drive
 * do próprio guarda: custo zero, os 15 GB são dele, e nenhum dado de jornada
 * fica sob responsabilidade de terceiro.
 *
 * O escopo é `drive.file`: o app enxerga SÓ o arquivo que ele mesmo criou.
 * Não vê foto, não vê documento, não vê mais nada do Drive do guarda. Isso é
 * escolha, não limitação — é o mínimo necessário para o trabalho.
 *
 * Regra que atravessa o arquivo inteiro: SINCRONIZAR NUNCA PODE DERRUBAR O APP.
 * Sem internet, com o Google fora do ar ou com a permissão vencida, o app
 * continua funcionando offline como sempre funcionou. A sincronização falha em
 * silêncio, guarda o motivo e tenta de novo depois.
 */

import { juntar, mudou } from './juntar.js';
import {
  exportarParaSincronizar, aplicarSincronizado, getConfig, setConfig
} from './db.js';

/* ID do cliente OAuth deste app. Não é senha: fica visível no código de
   qualquer aplicativo de navegador, e é assim que o Google projetou. Quem
   protege o acesso é a lista de origens autorizadas lá no console. */
export const CLIENT_ID_PADRAO =
  '618176113793-28fqt6kapivpgv66qqg3tcjdce4mrnej.apps.googleusercontent.com';

/* Dois escopos, os dois "não sensíveis":
   - drive.file: só o arquivo que o app cria. Não vê nada mais do Drive.
   - userinfo.email: só para SABER qual conta foi escolhida, e poder pedir ao
     Google que renove sempre nela. Sem isso ele abre a lista de contas a cada
     renovação, de hora em hora. */
const ESCOPO = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';

/**
 * Para onde o Google devolve o guarda depois de autorizar. Precisa bater
 * EXATAMENTE com o que está cadastrado no Google Cloud, em "URIs de
 * redirecionamento autorizados" — um caractere de diferença e ele recusa.
 *
 * O `index.html` é retirado de propósito: instalado na tela inicial, o app
 * abre em /gcm-ponto/index.html, e pelo navegador em /gcm-ponto/. Sem esta
 * limpeza seriam dois endereços diferentes, e só um deles funcionaria.
 */
const RETORNO = `${location.origin}${location.pathname}`.replace(/index\.html$/, '');
const NOME_ARQUIVO = 'gcm-ponto-dados.json';
const GIS = 'https://accounts.google.com/gsi/client';

/* O token vive só na memória. Não vai para o banco de propósito: se o aparelho
   for perdido, não há credencial gravada nele. O custo é reautorizar de vez em
   quando, o que é barato. */
let token = null;
let expiraEm = 0;
let clienteToken = null;
let clienteConta;   // a conta com que o cliente atual foi montado

/**
 * Instalado na tela inicial, o app roda sem barra de navegador — e nesse modo
 * o Android BLOQUEIA a janelinha que o Google usa para pedir a conta. Sem
 * janela, não há como autorizar.
 *
 * A saída é sair da tela inteira para o Google e voltar depois, como faz
 * qualquer site. Só vale para a autorização; o resto do app não muda.
 */
export function ehAppInstalado() {
  try {
    return window.matchMedia?.('(display-mode: standalone)')?.matches === true
      || window.navigator?.standalone === true;
  } catch {
    return false;
  }
}

const temToken = () => !!token && Date.now() < expiraEm - 60000;

/* ------------------------------------------------------------ Carregar o GIS */

let promessaGIS = null;

/** Baixa a biblioteca do Google só quando o guarda liga a sincronização. */
function carregarGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (promessaGIS) return promessaGIS;

  promessaGIS = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      promessaGIS = null;
      reject(new Error('Não consegui falar com o Google. Verifique a internet.'));
    };
    document.head.appendChild(s);
  });
  return promessaGIS;
}

/* -------------------------------------------------------------- Autorização */

export const getClientId = () => getConfig('driveClientId', CLIENT_ID_PADRAO);
export const setClientId = (id) => setConfig('driveClientId', id || CLIENT_ID_PADRAO);

export const conectado = () => getConfig('driveLigado', false);
export const setConectado = (v) => setConfig('driveLigado', !!v);

/** O e-mail da conta escolhida. É o que evita a pergunta a cada renovação. */
export const contaConectada = () => getConfig('driveConta', null);

/** Pergunta ao Google qual conta autorizou. Falhar aqui não impede nada. */
async function descobrirConta(t) {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${t}` }
    });
    if (!r.ok) return null;
    return (await r.json())?.email || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------- Autorização saindo da tela */

/**
 * Manda o guarda para o Google numa navegação de página inteira. É o caminho
 * que funciona no app instalado, onde a janelinha é bloqueada.
 *
 * A rota em que ele estava fica guardada para o app voltar no mesmo lugar.
 */
export async function autorizarSaindoDaTela() {
  const clientId = await getClientId();
  if (!clientId) throw new Error('Falta o ID do cliente do Google nos Ajustes.');
  const conta = await contaConectada();

  try { sessionStorage.setItem('driveVoltarPara', location.hash || '#/ajustes'); } catch { /* sem sessão, volta para Ajustes */ }

  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: RETORNO,
    response_type: 'token',
    scope: ESCOPO,
    include_granted_scopes: 'true',
    prompt: 'consent'
  });
  if (conta) p.set('login_hint', conta);

  location.href = `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

/**
 * Lê a resposta do Google quando ele devolve o guarda para o app.
 *
 * O Google devolve os dados depois do # do endereço, que é o mesmo lugar onde
 * este app guarda a tela atual. Por isso a resposta é lida e APAGADA na hora,
 * e a rota anterior é reposta — senão o app tentaria abrir uma tela chamada
 * "access_token" e mostraria página em branco.
 */
let retornoPendente = null;

export function lerRetornoDoGoogle() {
  if (retornoPendente) return retornoPendente;
  const bruto = (location.hash || '').replace(/^#/, '');
  if (!bruto.includes('access_token=') && !bruto.includes('error=')) return null;

  const p = new URLSearchParams(bruto);
  let voltarPara = '#/ajustes';
  try { voltarPara = sessionStorage.getItem('driveVoltarPara') || '#/ajustes'; } catch { /* padrão */ }
  try { sessionStorage.removeItem('driveVoltarPara'); } catch { /* nada */ }
  if (voltarPara.includes('access_token') || !voltarPara.startsWith('#/')) voltarPara = '#/ajustes';

  history.replaceState(null, '', `${location.pathname}${location.search}${voltarPara}`);

  const erro = p.get('error');
  if (erro) {
    retornoPendente = { erro: erro === 'access_denied'
      ? 'Você não autorizou o acesso ao Drive.'
      : 'O Google recusou a autorização. Tente conectar de novo.' };
    return retornoPendente;
  }

  const t = p.get('access_token');
  if (!t) return null;
  token = t;
  expiraEm = Date.now() + (Number(p.get('expires_in') || 3600) * 1000);
  retornoPendente = { token: t };
  return retornoPendente;
}

/**
 * Fecha a conexão depois da volta do Google. Chamado uma vez, na abertura.
 * Devolve o e-mail conectado, ou null quando não houve volta nenhuma.
 */
export async function concluirRetorno() {
  const r = lerRetornoDoGoogle();
  retornoPendente = null;
  if (!r) return null;
  if (r.erro) {
    await setConfig('driveErro', r.erro).catch(() => {});
    return { erro: r.erro };
  }
  const conta = await descobrirConta(r.token);
  if (conta) await setConfig('driveConta', conta);
  clienteConta = undefined;
  await setConectado(true);
  await setConfig('driveErro', null).catch(() => {});
  return { conta };
}


async function pedirToken({ interativo }) {
  await carregarGIS();
  const clientId = await getClientId();
  if (!clientId) throw new Error('Falta o ID do cliente do Google nos Ajustes.');
  const conta = await contaConectada();

  return new Promise((resolve, reject) => {
    /* O `hint` diz ao Google QUAL conta usar. Com ele a renovação é silenciosa;
       sem ele, o Google abre a lista de contas toda vez. O cliente é remontado
       quando a conta muda, porque o hint é fixado na criação. */
    if (!clienteToken || clienteConta !== conta) {
      clienteToken = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: ESCOPO,
        hint: conta || undefined,
        select_account: false,
        callback: () => {}
      });
      clienteConta = conta;
    }
    clienteToken.callback = (resposta) => {
      if (resposta?.error) {
        reject(new Error(
          resposta.error === 'access_denied'
            ? 'Você não autorizou o acesso ao Drive.'
            : 'O Google recusou a autorização. Tente conectar de novo nos Ajustes.'
        ));
        return;
      }
      token = resposta.access_token;
      expiraEm = Date.now() + (Number(resposta.expires_in || 3600) * 1000);
      resolve(token);
    };
    /* A tela de permissão só aparece quando ainda não se sabe a conta. Depois
       disso é sempre silencioso, mesmo ao apertar "Sincronizar agora". */
    clienteToken.requestAccessToken({ prompt: (interativo && !conta) ? 'consent' : '' });
  });
}

async function garantirToken({ interativo = false } = {}) {
  if (temToken()) return token;
  return pedirToken({ interativo });
}

/**
 * Liga a sincronização.
 *
 * No app instalado na tela inicial, sai da tela para o Google — a janelinha
 * seria bloqueada ali. No navegador usa a janelinha, que é mais confortável
 * por não tirar o guarda de onde ele estava.
 */
export async function conectar() {
  if (ehAppInstalado()) {
    await autorizarSaindoDaTela();
    return null;   // a página já está saindo; o resto acontece na volta
  }
  const t = await pedirToken({ interativo: true });
  const conta = await descobrirConta(t);
  if (conta) await setConfig('driveConta', conta);
  clienteConta = undefined;
  await setConectado(true);
  return conta;
}

/** Desliga. Não apaga nada: nem daqui, nem do Drive. */
export async function desconectar() {
  try { window.google?.accounts?.oauth2?.revoke?.(token); } catch { /* já era */ }
  token = null;
  expiraEm = 0;
  clienteToken = null;
  clienteConta = undefined;
  await setConfig('driveConta', null);
  await setConectado(false);
}

/* ------------------------------------------------------------------- Drive */

async function api(url, opcoes = {}) {
  const t = await garantirToken();
  const r = await fetch(url, {
    ...opcoes,
    headers: { Authorization: `Bearer ${t}`, ...(opcoes.headers || {}) }
  });
  if (r.status === 401 || r.status === 403) {
    token = null;
    throw new Error('A autorização do Google venceu. Conecte de novo nos Ajustes.');
  }
  if (!r.ok) throw new Error(`O Drive respondeu com erro ${r.status}.`);
  return r;
}

/** Acha o arquivo do app no Drive. Devolve null se ainda não existe. */
async function acharArquivo() {
  const q = encodeURIComponent(`name='${NOME_ARQUIVO}' and trashed=false`);
  const r = await api(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&spaces=drive&pageSize=10`
  );
  const { files = [] } = await r.json();
  /* Se por acidente existir mais de um, vale o mais recente — e os outros
     ficam lá, intocados. Apagar arquivo do guarda não é atribuição do app. */
  return files.sort((a, b) => (a.modifiedTime < b.modifiedTime ? 1 : -1))[0]?.id || null;
}

async function baixar(id) {
  const r = await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  try {
    return await r.json();
  } catch {
    throw new Error('O arquivo no Drive está corrompido. Desconecte e conecte de novo.');
  }
}

async function subir(id, dados) {
  const corpo = JSON.stringify({ ...dados, app: 'GCM Ponto', formato: 'sync-1', geradoEm: Date.now() });

  if (id) {
    await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: corpo
    });
    return id;
  }

  /* Primeira vez: cria o arquivo com nome e descrição, para o guarda entender
     o que é aquilo se topar com ele no Drive. */
  const limite = '-------gcmponto' + Date.now();
  const meta = {
    name: NOME_ARQUIVO,
    mimeType: 'application/json',
    description: 'Dados do app GCM Ponto. Não apague: é a cópia que sincroniza seus lançamentos entre celular e computador.'
  };
  const multipart =
    `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${limite}\r\nContent-Type: application/json\r\n\r\n${corpo}\r\n--${limite}--`;

  const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${limite}` },
    body: multipart
  });
  const { id: novoId } = await r.json();
  return novoId;
}

/* ------------------------------------------------------------ Sincronização */

let emAndamento = null;

/**
 * Baixa o que está no Drive, junta com o que está no aparelho, grava dos dois
 * lados o que faltar. Devolve um resumo do que aconteceu.
 *
 * Só escreve quando há o que escrever: se nada mudou, não gasta internet do
 * guarda nem escrita no banco.
 */
export async function sincronizar({ interativo = false } = {}) {
  /* Duas sincronizações ao mesmo tempo se atropelariam. A segunda espera a
     primeira em vez de começar do zero. */
  if (emAndamento) return emAndamento;

  emAndamento = (async () => {
    try {
      await garantirToken({ interativo });

      const local = await exportarParaSincronizar();
      const id = await acharArquivo();
      const remoto = id ? await baixar(id) : {};

      const junto = juntar(local, remoto);

      let baixados = 0;
      if (mudou(local, junto)) {
        await aplicarSincronizado(junto);
        baixados = junto.lancamentos.length - (local.lancamentos || []).length;
      }

      const idFinal = mudou(remoto, junto) ? await subir(id, junto) : id;

      const quando = Date.now();
      await setConfig('driveUltimaSync', quando);
      await setConfig('driveErro', null);
      if (idFinal) await setConfig('driveArquivoId', idFinal);

      return {
        ok: true, quando,
        lancamentos: junto.lancamentos.length,
        baixados: Math.max(0, baixados),
        mudouAqui: mudou(local, junto)
      };
    } catch (e) {
      let motivo = e?.message || 'Falha ao sincronizar.';
      /* No app instalado não há como renovar em silêncio: a janelinha é
         bloqueada. Quando a permissão vence, o guarda precisa tocar em
         conectar de novo — e a mensagem tem que dizer isso, não "erro". */
      if (ehAppInstalado() && /autoriza|permiss|popup|denied/i.test(motivo)) {
        motivo = 'A permissão do Google venceu. Toque em "Reconectar ao Drive".';
      }
      await setConfig('driveErro', motivo).catch(() => {});
      return { ok: false, erro: motivo };
    } finally {
      emAndamento = null;
    }
  })();

  return emAndamento;
}

/** Estado para mostrar nos Ajustes. */
export async function estado() {
  const [ligado, ultima, erro, clientId, conta] = await Promise.all([
    conectado(), getConfig('driveUltimaSync', null), getConfig('driveErro', null),
    getClientId(), contaConectada()
  ]);
  return { ligado, ultima, erro, clientId, conta, instalado: ehAppInstalado() };
}

/** '2 minutos', 'há 3 dias' — para o guarda saber se pode confiar. */
export function desdeQuando(quando) {
  if (!quando) return 'nunca';
  const seg = Math.floor((Date.now() - quando) / 1000);
  if (seg < 60) return 'agora mesmo';
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `há ${Math.floor(seg / 3600)}h`;
  return `há ${Math.floor(seg / 86400)} dia(s)`;
}
