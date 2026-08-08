import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { TopBar, Sheet } from '../components/UI.jsx';
import Cadastro from './Cadastro.jsx';
import { baixarBackup, baixarBackupCompleto, restaurarBackup } from '../services/backup.js';
import { apagarTudo } from '../services/db.js';
import * as drive from '../services/drive.js';
import {
  pinCadastrado, removerPin, cadastrarPin, biometriaDisponivel,
  biometriaCadastrada, cadastrarBiometria, removerBiometria
} from '../services/auth.js';
import {
  nomeCompetencia, horasCurto, CARGA_MENSAL, LIMITE_EXTRA, calcularCompetencia
} from '../services/calc.js';
import {
  IcoUser, IcoLock, IcoFinger, IcoDownload, IcoUpload, IcoMoon, IcoSun,
  IcoTrash, IcoChevron, IcoCheck, IcoShield, IcoDoc, IcoPasta, IcoPacote, IcoAlert
} from '../components/Icons.jsx';

export default function Ajustes({ ir }) {
  const {
    perfil, tema, alternarTema, avisar, recarregar, lancamentos,
    competenciasDisponiveis, fechamentos, setCompetencia
  } = useApp();

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [temPin, setTemPin] = useState(false);
  const [bioDisponivel, setBioDisponivel] = useState(false);
  const [bioAtiva, setBioAtiva] = useState(false);
  const [novoPin, setNovoPin] = useState(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [restaurando, setRestaurando] = useState(null);
  const [progresso, setProgresso] = useState(null);
  const inputArquivo = useRef(null);

  const atualizarSeguranca = async () => {
    setTemPin(await pinCadastrado());
    setBioDisponivel(await biometriaDisponivel());
    setBioAtiva(await biometriaCadastrada());
  };
  useEffect(() => { atualizarSeguranca(); }, []);

  if (editandoPerfil) {
    return <Cadastro inicial={perfil} aoConcluir={() => setEditandoPerfil(false)} />;
  }

  const linha = (Icone, titulo, descricao, aoTocar, direita = <IcoChevron size={16} />) => (
    <button className="item" style={{ width: '100%' }} onClick={aoTocar}>
      <div className="topbar-badge" style={{ background: 'var(--surface-2)', color: 'var(--navy-600)', border: '1px solid var(--line)' }}>
        <Icone size={19} />
      </div>
      <div className="item-main">
        <div className="t">{titulo}</div>
        <div className="s">{descricao}</div>
      </div>
      <div style={{ color: 'var(--muted)' }}>{direita}</div>
    </button>
  );

  const escolherArquivo = () => inputArquivo.current?.click();

  const aoEscolherArquivo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setRestaurando(file);
  };

  const confirmarRestauracao = async (substituir) => {
    const arquivo = restaurando;
    setRestaurando(null);
    try {
      const r = await restaurarBackup(arquivo, { substituir }, setProgresso);
      await recarregar();
      avisar(
        r.documentos > 0
          ? `Restaurado: ${r.lancamentos} lançamento(s) e ${r.documentos} arquivo(s).`
          : `Restaurado: ${r.lancamentos} lançamento(s).`
      );
    } catch (err) {
      avisar(err.message || 'Falha ao restaurar.');
    } finally {
      setProgresso(null);
    }
  };

  return (
    <>
      <TopBar titulo="Ajustes" subtitulo="Dados, segurança e backup" />

      <div className="screen">
        <div className="pull-up">
          <div className="card">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div className="topbar-badge" style={{ width: 54, height: 54, background: 'var(--navy-900)', color: '#fff', border: 0 }}>
                <IcoUser size={26} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{perfil?.nome || 'Guarda'}</div>
                <div className="hint" style={{ margin: 0 }}>
                  Matrícula {perfil?.matricula || '—'} · {perfil?.unidade || '—'}
                </div>
                <div className="hint" style={{ margin: 0 }}>{perfil?.municipio || '—'}</div>
              </div>
            </div>
            <button className="btn btn-ghost mt-14" onClick={() => setEditandoPerfil(true)}>Editar meus dados</button>
          </div>
        </div>

        <div className="section-title">Competências</div>
        <div className="card">
          {competenciasDisponiveis.slice(0, 12).map((c) => {
            const r = calcularCompetencia(lancamentos.filter((l) => l.competencia === c));
            const f = fechamentos.find((x) => x.id === c);
            return (
              <div key={c} className="kv" style={{ cursor: 'pointer' }} onClick={() => { setCompetencia(c); ir('dashboard'); }}>
                <span>{nomeCompetencia(c)}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <b>{horasCurto(r.total)}</b>
                  {f?.fechada && <span className="tag tag-green">fechada</span>}
                  {f?.assinatura && <span className="tag tag-gray">assinada</span>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="section-title">Segurança</div>
        <div className="stack-2">
          {linha(IcoLock, 'PIN de assinatura',
            temPin ? 'Cadastrado' : 'Não cadastrado',
            () => setNovoPin({ etapa: 'criar', pin: '', primeiro: '', erro: '' }),
            temPin ? <span className="tag tag-green">ativo</span> : <IcoChevron size={16} />)}

          {linha(IcoFinger, 'Biometria',
            !bioDisponivel ? 'Indisponível neste aparelho' : bioAtiva ? 'Cadastrada' : 'Não cadastrada',
            async () => {
              if (!bioDisponivel) return avisar('Este aparelho não oferece biometria para aplicativos.');
              try {
                if (bioAtiva) { await removerBiometria(); avisar('Biometria removida.'); }
                else { await cadastrarBiometria(perfil); avisar('Biometria cadastrada.'); }
                atualizarSeguranca();
              } catch (e) { avisar(e?.message || 'Não foi possível cadastrar.'); }
            },
            bioAtiva ? <span className="tag tag-green">ativa</span> : <IcoChevron size={16} />)}

          {linha(tema === 'dark' ? IcoSun : IcoMoon, 'Modo escuro',
            tema === 'dark' ? 'Ligado' : 'Desligado',
            alternarTema,
            <span className={`tag ${tema === 'dark' ? 'tag-green' : 'tag-gray'}`}>{tema === 'dark' ? 'ligado' : 'desligado'}</span>)}
        </div>

        <div className="section-title">Sincronização entre aparelhos</div>
        <Sincronizacao avisar={avisar} />

        <div className="section-title">Gaveta de arquivos</div>
        {linha(IcoPasta, 'Meus arquivos',
          'Fotos da folha assinada, escalas e comprovantes',
          () => ir('documentos'))}

        <div className="section-title">Backup</div>

        <div className="alert alert-blue">
          <div>
            <b>Trocando de celular?</b>
            Use o <b style={{ display: 'inline' }}>backup completo</b>. Ele leva
            os lançamentos <i>e</i> os arquivos da gaveta num pacote só. Salve no
            Google Drive ou mande para o seu e-mail — depois é só restaurar no
            aparelho novo.
          </div>
        </div>

        <div className="stack-2">
          {linha(IcoPacote, 'Backup completo',
            'Lançamentos + fotos e PDFs da gaveta',
            async () => {
              try {
                const r = await baixarBackupCompleto(setProgresso);
                avisar(`Backup ${r.via}: ${r.nome}`);
              } catch (e) {
                avisar(e?.message || 'Não consegui gerar o backup.');
              } finally {
                setProgresso(null);
              }
            },
            <span className="tag tag-green">recomendado</span>)}

          {linha(IcoDownload, 'Backup leve',
            'Só os lançamentos, em .json — cabe no WhatsApp',
            async () => {
              const r = await baixarBackup();
              avisar(`Backup ${r.via}: ${r.nome}`);
            })}

          {linha(IcoUpload, 'Restaurar backup',
            'Aceita os dois formatos',
            escolherArquivo)}
        </div>

        {progresso && (
          <div className="alert alert-blue mt-14">
            <div><b>Preparando o pacote</b>{progresso}</div>
          </div>
        )}

        <input ref={inputArquivo} type="file" accept=".gcm,.json,.zip,application/json" hidden onChange={aoEscolherArquivo} />
        <p className="hint">O PIN e a biometria não entram no backup — eles pertencem a este aparelho.</p>

        <div className="section-title">Regras aplicadas</div>
        <div className="card">
          <div className="kv"><span>Carga horária mensal</span><b>{CARGA_MENSAL}h</b></div>
          <div className="kv"><span>Teto de hora extra</span><b>{LIMITE_EXTRA}h</b></div>
          <div className="kv"><span>Alertas de extra</span><b>35h · 40h · 44h</b></div>
          <div className="kv"><span>Divisão automática</span><b>Ativa</b></div>
          <div className="kv"><span>Armazenamento</span><b>Local (offline)</b></div>
        </div>

        <div className="section-title">Zona de risco</div>
        <button className="btn btn-danger" onClick={() => setConfirmandoApagar(true)}>
          <IcoTrash size={18} /> Apagar todos os dados
        </button>

        <p className="hint center mt-20" style={{ paddingBottom: 8 }}>
          GCM Ponto · versão 1.0.0<br />Controle Inteligente de Jornada da Guarda Municipal
        </p>
      </div>

      {novoPin && <TrocarPin estado={novoPin} setEstado={setNovoPin} temPin={temPin}
        fechar={() => { setNovoPin(null); atualizarSeguranca(); }} avisar={avisar} />}

      {restaurando && (
        <Sheet titulo="Restaurar backup" subtitulo={restaurando.name} fechar={() => setRestaurando(null)}>
          <div className="alert alert-blue">
            <div><b>Escolha como restaurar</b>Somar mantém o que já existe. Substituir apaga tudo antes de importar.</div>
          </div>
          <button className="btn btn-primary" onClick={() => confirmarRestauracao(false)}>Somar aos meus dados</button>
          <button className="btn btn-danger mt-14" onClick={() => confirmarRestauracao(true)}>Substituir tudo</button>
          <button className="btn btn-ghost mt-14" onClick={() => setRestaurando(null)}>Cancelar</button>
        </Sheet>
      )}

      {confirmandoApagar && (
        <Sheet titulo="Apagar todos os dados?" subtitulo="Perfil, lançamentos, competências e PIN." fechar={() => setConfirmandoApagar(false)}>
          <div className="alert alert-red">
            <div><b>Sem volta</b>Gere um backup antes se quiser guardar o histórico.</div>
          </div>
          <button className="btn btn-ghost" onClick={async () => { const r = await baixarBackup(); avisar(`Backup ${r.via}.`); }}>
            <IcoDownload size={18} /> Gerar backup primeiro
          </button>
          <button className="btn btn-danger mt-14" onClick={async () => {
            await apagarTudo();
            setConfirmandoApagar(false);
            avisar('Dados apagados.');
            window.location.reload();
          }}>Apagar tudo mesmo assim</button>
          <button className="btn btn-ghost mt-14" onClick={() => setConfirmandoApagar(false)}>Cancelar</button>
        </Sheet>
      )}
    </>
  );
}

/* --------------------------------------------------- Sincronização (Drive) */

/**
 * Liga e acompanha a cópia comum no Google Drive.
 *
 * Mostra sempre QUANDO foi a última vez. Sincronização que se diz "ativa" sem
 * dizer quando funcionou pela última vez não serve para quem depende dela.
 */
function Sincronizacao({ avisar }) {
  const { sincronizar, sincronizando, ultimaSync } = useApp();
  const [info, setInfo] = useState(null);
  const [conectando, setConectando] = useState(false);
  const [trocandoId, setTrocandoId] = useState(false);
  const [novoId, setNovoId] = useState('');

  const atualizar = async () => setInfo(await drive.estado());
  useEffect(() => { atualizar(); }, [ultimaSync, sincronizando]);

  if (!info) return <div className="card"><p className="hint" style={{ margin: 0 }}>Carregando…</p></div>;

  const quando = info.ultima || ultimaSync;
  const atrasado = quando && (Date.now() - quando) > 3 * 86400000;

  if (!info.ligado) {
    return (
      <>
        <div className="card">
          <p className="hint" style={{ marginTop: 0 }}>
            Hoje seus lançamentos ficam só neste aparelho. Ligando a sincronização,
            eles passam a ir para o <b style={{ display: 'inline' }}>seu</b> Google Drive
            e aparecem também no computador — e ao contrário.
          </p>
          <p className="hint">
            O app enxerga apenas o arquivo que ele mesmo cria. Não vê suas fotos,
            nem seus documentos, nem mais nada do Drive.
          </p>
          <button className="btn btn-primary mt-14" disabled={conectando} onClick={async () => {
            setConectando(true);
            try {
              await drive.conectar();
              await atualizar();
              const r = await sincronizar({ avisando: true });
              if (r?.ok) avisar('Drive conectado.');
            } catch (e) {
              avisar(e?.message || 'Não consegui conectar ao Drive.');
            } finally {
              setConectando(false);
            }
          }}>
            <IcoUpload size={18} /> {conectando ? 'Conectando…' : 'Conectar ao Google Drive'}
          </button>
        </div>
        <p className="hint">
          O Google vai avisar que o app não foi verificado. É esperado: ele é seu,
          não está publicado em loja nenhuma. Toque em Avançado e siga.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="card">
        <div className="kv">
          <span>Estado</span>
          <span className="tag tag-green">ligado</span>
        </div>
        <div className="kv">
          <span>Última sincronização</span>
          <b style={{ color: atrasado ? 'var(--red)' : 'var(--ink)' }}>
            {sincronizando ? 'agora…' : drive.desdeQuando(quando)}
          </b>
        </div>
        {info.erro && (
          <div className="alert alert-orange mt-14">
            <IcoAlert size={19} style={{ flex: 'none' }} />
            <div><b>A última tentativa falhou</b>{info.erro}</div>
          </div>
        )}
        <button className="btn btn-navy mt-14" disabled={sincronizando} onClick={async () => {
          await sincronizar({ avisando: true });
          atualizar();
        }}>
          <IcoUpload size={18} /> {sincronizando ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
      </div>

      <p className="hint">
        Sincroniza sozinha ao abrir o app, ao voltar para ele e alguns segundos
        depois de cada lançamento. Os arquivos da gaveta não vão junto — são
        pesados demais; para eles, use o backup completo.
      </p>

      <div className="stack-2">
        {linhaSimples(IcoLock, 'Trocar o ID do cliente Google',
          'Só se você refizer a configuração no Google Cloud',
          () => { setNovoId(info.clientId || ''); setTrocandoId(true); })}
        {linhaSimples(IcoTrash, 'Desligar a sincronização',
          'Não apaga nada, nem aqui nem no Drive',
          async () => { await drive.desconectar(); atualizar(); avisar('Sincronização desligada.'); })}
      </div>

      {trocandoId && (
        <Sheet titulo="ID do cliente Google" subtitulo="Gerado no Google Cloud, em Clientes"
          fechar={() => setTrocandoId(false)}>
          <div className="field">
            <label htmlFor="clientId">ID do cliente</label>
            <input id="clientId" className="input" value={novoId}
              onChange={(e) => setNovoId(e.target.value.trim())}
              placeholder="000000-xxxx.apps.googleusercontent.com" />
          </div>
          <button className="btn btn-primary mt-14" onClick={async () => {
            await drive.setClientId(novoId);
            setTrocandoId(false);
            atualizar();
            avisar('ID salvo. Conecte de novo.');
          }}>Salvar</button>
          <button className="btn btn-ghost mt-14" onClick={() => setTrocandoId(false)}>Cancelar</button>
        </Sheet>
      )}
    </>
  );
}

/** Mesma linha da lista de Ajustes, usável fora do componente principal. */
const linhaSimples = (Icone, titulo, descricao, aoTocar) => (
  <button className="item" style={{ width: '100%' }} onClick={aoTocar}>
    <div className="topbar-badge" style={{ background: 'var(--surface-2)', color: 'var(--navy-600)', border: '1px solid var(--line)' }}>
      <Icone size={19} />
    </div>
    <div className="item-main">
      <div className="t">{titulo}</div>
      <div className="s">{descricao}</div>
    </div>
    <div style={{ color: 'var(--muted)' }}><IcoChevron size={16} /></div>
  </button>
);

/* --------------------------------------------------------- Troca de PIN */

function TrocarPin({ estado, setEstado, temPin, fechar, avisar }) {
  const { pin, primeiro, etapa, erro } = estado;

  const digitar = (d) => {
    if (pin.length >= 6) return;
    const novo = pin + d;
    setEstado((s) => ({ ...s, pin: novo, erro: '' }));
    if (novo.length === 6) setTimeout(() => processar(novo), 140);
  };

  const processar = async (valor) => {
    if (etapa === 'criar') {
      setEstado((s) => ({ ...s, primeiro: valor, pin: '', etapa: 'confirmar' }));
      return;
    }
    if (valor !== primeiro) {
      setEstado({ etapa: 'criar', pin: '', primeiro: '', erro: 'Os PINs não bateram. Comece de novo.' });
      return;
    }
    await cadastrarPin(valor);
    avisar('PIN salvo.');
    fechar();
  };

  return (
    <Sheet
      titulo={etapa === 'criar' ? (temPin ? 'Novo PIN' : 'Criar PIN') : 'Repita o PIN'}
      subtitulo="Seis dígitos. Fica guardado só neste aparelho."
      fechar={fechar}
    >
      <div className="pin-dots">
        {Array.from({ length: 6 }, (_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>
      {erro && <div className="alert alert-red">{erro}</div>}
      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => digitar(String(n))}>{n}</button>)}
        <button className="wide" onClick={async () => { await removerPin(); avisar('PIN removido.'); fechar(); }}>Remover</button>
        <button onClick={() => digitar('0')}>0</button>
        <button className="wide" onClick={() => setEstado((s) => ({ ...s, pin: s.pin.slice(0, -1) }))}>Apagar</button>
      </div>
    </Sheet>
  );
}
