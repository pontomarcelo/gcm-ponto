/**
 * GCM Ponto — Camada de persistência local (IndexedDB).
 * Tudo fica no aparelho. Nada sai daqui sem o guarda mandar.
 *
 * Stores:
 *  - perfil        : dados do guarda (registro único, id = 'me')
 *  - lancamentos   : jornadas registradas
 *  - competencias  : status de fechamento por mês (id = 'YYYY-MM')
 *  - config        : preferências (tema, PIN, credencial biométrica)
 */

const DB_NAME = 'gcm-ponto';
const DB_VERSION = 2;

let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('perfil')) {
        db.createObjectStore('perfil', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('lancamentos')) {
        const s = db.createObjectStore('lancamentos', { keyPath: 'id' });
        s.createIndex('competencia', 'competencia', { unique: false });
        s.createIndex('data', 'data', { unique: false });
      }
      if (!db.objectStoreNames.contains('competencias')) {
        db.createObjectStore('competencias', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('documentos')) {
        const s = db.createObjectStore('documentos', { keyPath: 'id' });
        s.createIndex('competencia', 'competencia', { unique: false });
      }
    };

    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ------------------------------------------------------------------ CRUD */

export const put = (store, value) => tx(store, 'readwrite').then((s) => wrap(s.put(value)));
export const get = (store, key) => tx(store).then((s) => wrap(s.get(key)));
export const del = (store, key) => tx(store, 'readwrite').then((s) => wrap(s.delete(key)));
export const all = (store) => tx(store).then((s) => wrap(s.getAll()));
export const clear = (store) => tx(store, 'readwrite').then((s) => wrap(s.clear()));

export const byIndex = (store, index, value) =>
  tx(store).then((s) => wrap(s.index(index).getAll(value)));

/* ---------------------------------------------------------------- Perfil */

export const getPerfil = () => get('perfil', 'me');
export const savePerfil = (dados) => put('perfil', { ...dados, id: 'me', atualizadoEm: Date.now() });

/* ----------------------------------------------------------- Lançamentos */

export const listarLancamentos = () => all('lancamentos');
export const listarPorCompetencia = (competencia) => byIndex('lancamentos', 'competencia', competencia);
export const salvarLancamento = (l) => put('lancamentos', l);
export const excluirLancamento = (id) => del('lancamentos', id);

/* ---------------------------------------------------------- Competências */

export const getCompetencia = (id) => get('competencias', id);
export const listarCompetencias = () => all('competencias');
export const salvarCompetencia = (c) => put('competencias', c);

/* ------------------------------------------------------------ Documentos */

export const listarDocumentos = () => all('documentos');
export const salvarDocumento = (d) => put('documentos', d);
export const excluirDocumento = (id) => del('documentos', id);
export const getDocumento = (id) => get('documentos', id);

/** Quanto o navegador ainda deixa guardar neste aparelho. */
export async function espacoDisponivel() {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usado: usage, total: quota, livre: Math.max(0, quota - usage) };
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- Config */

export const getConfig = async (id, fallback = null) => {
  const r = await get('config', id);
  return r ? r.valor : fallback;
};
export const setConfig = (id, valor) => put('config', { id, valor });

/* --------------------------------------------------------- Backup total */

export async function exportarTudo() {
  const [perfil, lancamentos, competencias, config, docs] = await Promise.all([
    all('perfil'), all('lancamentos'), all('competencias'), all('config'), all('documentos')
  ]);
  return {
    app: 'GCM Ponto',
    versao: 2,
    /* Os arquivos da gaveta NÃO entram aqui: são binários e inflariam o
       backup para centenas de megabytes. Vai só a lista, para o guarda
       saber o que precisa guardar por fora. */
    documentosNaoIncluidos: docs.map((d) => ({
      nome: d.nome, competencia: d.competencia, criadoEm: d.criadoEm
    })),
    geradoEm: new Date().toISOString(),
    perfil, lancamentos, competencias,
    // O PIN e a credencial biométrica não saem no backup, por segurança.
    config: config.filter((c) => !['pin', 'biometria'].includes(c.id))
  };
}

export async function importarTudo(dump, { substituir = false } = {}) {
  if (!dump || dump.app !== 'GCM Ponto') throw new Error('Arquivo não é um backup do GCM Ponto.');
  const db = await openDB();
  const stores = ['perfil', 'lancamentos', 'competencias', 'config'];

  if (substituir) {
    await Promise.all(stores.map((s) => clear(s)));
  }

  await new Promise((resolve, reject) => {
    const t = db.transaction(stores, 'readwrite');
    stores.forEach((name) => {
      (dump[name] || []).forEach((item) => t.objectStore(name).put(item));
    });
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });

  return {
    lancamentos: (dump.lancamentos || []).length,
    competencias: (dump.competencias || []).length
  };
}

export async function apagarTudo() {
  await Promise.all(['perfil', 'lancamentos', 'competencias', 'config', 'documentos'].map(clear));
}
