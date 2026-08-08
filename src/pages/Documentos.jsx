import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { TopBar, Sheet, SeletorCompetencia, Vazio } from '../components/UI.jsx';
import {
  listarDocumentos, salvarDocumento, excluirDocumento, espacoDisponivel
} from '../services/db.js';
import {
  nomeCompetencia, formatarData, hojeISO, competenciaDe, novoId, MESES_CURTO
} from '../services/calc.js';
import {
  IcoPlus, IcoDownload, IcoTrash, IcoShare, IcoSearch, IcoAlert, IcoDoc, IcoCamera
} from '../components/Icons.jsx';

/* ------------------------------------------------------------ Utilidades */

const ehImagem = (tipo) => (tipo || '').startsWith('image/');
const ehPDF = (tipo) => (tipo || '') === 'application/pdf';

function tamanhoLegivel(bytes) {
  if (!bytes) return '—';
  const un = ['B', 'KB', 'MB', 'GB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < un.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${un[i]}`;
}

/** Este navegador consegue redimensionar imagem? */
function podeComprimir() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext && c.getContext('2d') && c.toBlob);
  } catch {
    return false;
  }
}

/**
 * Reduz foto grande antes de guardar: a original de 4 MB não traz nenhuma
 * informação a mais numa folha de ponto fotografada.
 *
 * Nunca falha. Se o navegador não souber redimensionar, se a imagem não
 * carregar ou se demorar demais, guarda o arquivo original. Comprimir é
 * um bônus — travar o guarda em "Guardando…" para sempre não é opção.
 */
function comprimirImagem(file, ladoMax = 2000, qualidade = 0.82) {
  if (!podeComprimir()) return Promise.resolve(file);

  return new Promise((resolve) => {
    let respondido = false;
    let url = null;

    const terminar = (resultado) => {
      if (respondido) return;
      respondido = true;
      clearTimeout(prazo);
      if (url) URL.revokeObjectURL(url);
      resolve(resultado || file);
    };

    // Rede de segurança: imagem que nunca carrega não pode segurar o envio.
    const prazo = setTimeout(() => terminar(file), 6000);

    try {
      url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        try {
          const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
          if (escala === 1 && file.size < 900 * 1024) return terminar(file);

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => terminar(blob && blob.size < file.size ? blob : file),
            'image/jpeg',
            qualidade
          );
        } catch {
          terminar(file);
        }
      };

      img.onerror = () => terminar(file);
      img.src = url;
    } catch {
      terminar(file);
    }
  });
}

/* ================================================================= Tela */

export default function Documentos() {
  const { competencia, avisar, perfil } = useApp();
  const [docs, setDocs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);
  const [seletor, setSeletor] = useState(false);
  const [espaco, setEspaco] = useState(null);
  const [enviando, setEnviando] = useState(0);
  const entrada = useRef(null);

  const recarregar = async () => {
    try {
      const lista = await listarDocumentos();
      setDocs(lista.sort((a, b) => b.criadoEm - a.criadoEm));
      setEspaco(await espacoDisponivel());
    } catch {
      avisar('Não consegui ler a gaveta.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { recarregar(); }, []);

  /* ------------------------------------------------------------- Envio */

  const receber = async (e) => {
    const arquivos = [...(e.target.files || [])];
    e.target.value = '';
    if (!arquivos.length) return;

    setEnviando(arquivos.length);
    let guardados = 0;

    for (const file of arquivos) {
      try {
        const conteudo = ehImagem(file.type) ? await comprimirImagem(file) : file;
        await salvarDocumento({
          id: novoId(),
          nome: file.name || `arquivo-${Date.now()}`,
          tipo: file.type || 'application/octet-stream',
          tamanho: conteudo.size,
          competencia,
          data: hojeISO(),
          blob: conteudo,
          criadoEm: Date.now()
        });
        guardados++;
      } catch (err) {
        console.error(err);
      }
      setEnviando((n) => n - 1);
    }

    await recarregar();
    avisar(
      guardados === arquivos.length
        ? `${guardados} ${guardados === 1 ? 'arquivo guardado' : 'arquivos guardados'}.`
        : `${guardados} de ${arquivos.length} guardados. O aparelho pode estar sem espaço.`
    );
  };

  /* ------------------------------------------------------------ Filtro */

  const daCompetencia = useMemo(
    () => docs.filter((d) => d.competencia === competencia),
    [docs, competencia]
  );

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return daCompetencia;
    return daCompetencia.filter((d) => (d.nome || '').toLowerCase().includes(t));
  }, [daCompetencia, busca]);

  const pesoTotal = docs.reduce((s, d) => s + (d.tamanho || 0), 0);
  const quaseCheio = espaco && espaco.total > 0 && espaco.usado / espaco.total > 0.8;

  return (
    <>
      <TopBar
        titulo="Gaveta"
        subtitulo={`${daCompetencia.length} ${daCompetencia.length === 1 ? 'arquivo' : 'arquivos'} em ${nomeCompetencia(competencia)}`}
      />

      <div className="screen">
        <div className="pull-up">
          <div className="card">
            <p className="hint" style={{ marginTop: 0 }}>
              Guarde aqui a foto da folha assinada, o PDF da escala do grupo e o que
              mais precisar comprovar. Fica junto da competência do mês.
            </p>

            <input
              ref={entrada}
              type="file"
              multiple
              hidden
              onChange={receber}
              aria-hidden="true"
            />

            <button className="btn btn-primary mt-14" onClick={() => entrada.current?.click()}>
              <IcoPlus size={19} /> Guardar arquivo
            </button>

            <p className="hint">
              Aceita foto, PDF, documento — qualquer tipo. Dá para escolher vários de uma vez.
            </p>
          </div>
        </div>

        {enviando > 0 && (
          <div className="alert alert-blue mt-14">
            <div><b>Guardando…</b>{enviando} {enviando === 1 ? 'arquivo restante' : 'arquivos restantes'}.</div>
          </div>
        )}

        <div className="alert alert-orange mt-14">
          <IcoAlert size={19} style={{ flex: 'none', marginTop: 1 }} />
          <div>
            <b>Isto fica só neste aparelho</b>
            Trocou de celular ou limpou os dados do navegador, os arquivos se perdem.
            O backup em <i>.json</i> não carrega fotos. Mantenha as originais na sua galeria.
          </div>
        </div>

        {quaseCheio && (
          <div className="alert alert-red">
            <IcoAlert size={19} style={{ flex: 'none', marginTop: 1 }} />
            <div>
              <b>Espaço quase no fim</b>
              O navegador já usou {tamanhoLegivel(espaco.usado)} de {tamanhoLegivel(espaco.total)}.
              Apague arquivos antigos para não perder os novos.
            </div>
          </div>
        )}

        <div className="mt-20">
          <SeletorCompetencia aberto={seletor} abrir={() => setSeletor(true)} fechar={() => setSeletor(false)} />
        </div>

        {daCompetencia.length > 0 && (
          <div className="card mt-14">
            <div style={{ position: 'relative' }}>
              <IcoSearch size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder="Procurar pelo nome do arquivo"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                aria-label="Procurar arquivo"
              />
            </div>
          </div>
        )}

        <div className="section-title">
          {carregando ? 'Abrindo a gaveta…' : `${lista.length} ${lista.length === 1 ? 'arquivo' : 'arquivos'}`}
        </div>

        {!carregando && lista.length === 0 && (
          <Vazio
            titulo={busca ? 'Nada com esse nome' : 'Gaveta vazia neste mês'}
            texto={busca
              ? 'Tente outro termo ou limpe a busca.'
              : 'Guarde a foto da folha assinada ou o PDF da escala.'}
            acao={busca
              ? <button className="btn btn-ghost" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setBusca('')}>Limpar busca</button>
              : <button className="btn btn-primary" style={{ maxWidth: 260, margin: '0 auto' }} onClick={() => entrada.current?.click()}>
                <IcoPlus size={18} /> Guardar arquivo
              </button>}
          />
        )}

        {lista.length > 0 && (
          <div className="gaveta">
            {lista.map((d) => (
              <Miniatura key={d.id} doc={d} abrir={() => setAberto(d)} />
            ))}
          </div>
        )}

        {docs.length > 0 && (
          <p className="hint center mt-20">
            {docs.length} {docs.length === 1 ? 'arquivo' : 'arquivos'} em todas as competências
            {' · '}{tamanhoLegivel(pesoTotal)} ocupados
          </p>
        )}
      </div>

      {aberto && (
        <Visualizador
          doc={aberto}
          perfil={perfil}
          fechar={() => setAberto(null)}
          aoExcluir={async () => {
            await excluirDocumento(aberto.id);
            setAberto(null);
            await recarregar();
            avisar('Arquivo apagado.');
          }}
          avisar={avisar}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------ Miniatura */

function Miniatura({ doc, abrir }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!ehImagem(doc.tipo)) return;
    const u = URL.createObjectURL(doc.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [doc]);

  const [ano, mes] = (doc.competencia || '').split('-');

  return (
    <button className="gaveta-item" onClick={abrir} title={doc.nome}>
      <div className="gaveta-capa">
        {url ? (
          <img src={url} alt="" />
        ) : (
          <div className="gaveta-icone">
            {ehPDF(doc.tipo) ? <IcoDoc size={30} /> : <IcoDoc size={30} />}
            <span>{(doc.nome.split('.').pop() || 'arq').slice(0, 4).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="gaveta-nome">{doc.nome}</div>
      <div className="gaveta-meta">
        {mes ? `${MESES_CURTO[Number(mes) - 1]}/${ano.slice(2)}` : ''} · {tamanhoLegivel(doc.tamanho)}
      </div>
    </button>
  );
}

/* --------------------------------------------------------- Visualizador */

function Visualizador({ doc, perfil, fechar, aoExcluir, avisar }) {
  const [url, setUrl] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(doc.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [doc]);

  const baixar = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    avisar('Arquivo baixado.');
  };

  /* No iPhone, compartilhar é o caminho para "Salvar Imagem" na galeria —
     o download direto costuma parar em Arquivos, não em Fotos. */
  const compartilhar = async () => {
    try {
      const file = new File([doc.blob], doc.nome, { type: doc.tipo });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: doc.nome });
        return;
      }
      baixar();
    } catch {
      /* cancelou */
    }
  };

  return (
    <Sheet
      titulo={doc.nome}
      subtitulo={`${nomeCompetencia(doc.competencia)} · ${tamanhoLegivel(doc.tamanho)} · guardado em ${formatarData(doc.data || '')}`}
      fechar={fechar}
    >
      <div className="visor">
        {ehImagem(doc.tipo) && url && (
          <img src={url} alt={doc.nome} className="visor-img" />
        )}

        {ehPDF(doc.tipo) && url && (
          <>
            <object data={url} type="application/pdf" className="visor-pdf">
              <div className="visor-fallback">
                <IcoDoc size={40} />
                <p>Este navegador não mostra PDF aqui dentro.<br />Use os botões abaixo para abrir ou baixar.</p>
              </div>
            </object>
            <button className="btn btn-ghost mt-14" onClick={() => window.open(url, '_blank')}>
              Abrir em nova aba
            </button>
          </>
        )}

        {!ehImagem(doc.tipo) && !ehPDF(doc.tipo) && (
          <div className="visor-fallback">
            <IcoDoc size={40} />
            <p>{doc.nome}<br /><span className="hint">Baixe para abrir no aplicativo certo.</span></p>
          </div>
        )}
      </div>

      <div className="row-2 mt-14">
        <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={compartilhar}>
          <IcoShare size={17} /> Salvar na galeria
        </button>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={baixar}>
          <IcoDownload size={17} /> Baixar
        </button>
      </div>

      <button className="btn btn-danger mt-14" onClick={() => setConfirmando(true)}>
        <IcoTrash size={18} /> Apagar da gaveta
      </button>

      {confirmando && (
        <div className="alert alert-red mt-14">
          <div style={{ width: '100%' }}>
            <b>Apagar este arquivo?</b>
            Ele some deste aparelho e não tem como recuperar.
            <div className="row-2 mt-14">
              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => setConfirmando(false)}>Manter</button>
              <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={aoExcluir}>Apagar</button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
