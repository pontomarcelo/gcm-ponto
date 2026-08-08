import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { TopBar, Sheet } from '../components/UI.jsx';
import {
  CARGA_MENSAL, LIMITE_EXTRA, horasCurto, nomeCompetencia, competenciaAtual, periodoCurto
} from '../services/calc.js';
import { compartilharPDF, baixarArquivo, abrirWhatsApp, abrirEmail, imprimirPDF } from '../services/share.js';
import { baixarBackupCompleto } from '../services/backup.js';
import {
  pinCadastrado, cadastrarPin, validarPin, biometriaDisponivel, biometriaCadastrada,
  cadastrarBiometria, validarBiometria, abrirCameraFrontal, capturarQuadro, pararCamera, gerarSelo
} from '../services/auth.js';
import {
  IcoLock, IcoCamera, IcoFinger, IcoShare, IcoDownload, IcoPrint, IcoMail,
  IcoWhatsApp, IcoCheck, IcoDoc, IcoAlert, IcoShield
} from '../components/Icons.jsx';

export default function Relatorio({ voltar }) {
  const {
    perfil, resumo, competencia, competenciaFechada, fechamento,
    fecharCompetencia, reabrirCompetencia, registrarAssinatura, avisar, sincronizar
  } = useApp();

  const [confirmandoFechar, setConfirmandoFechar] = useState(false);
  const [pdf, setPdf] = useState(null);          // { blob, nomeArquivo }
  const [gerando, setGerando] = useState(false);
  const [assinando, setAssinando] = useState(false);

  /* Aviso de backup: aparece logo depois de fechar a competência. É o momento
     em que o mês virou prova — se o celular sumir agora, some com ele. */
  const [pedindoBackup, setPedindoBackup] = useState(false);
  const [progressoBackup, setProgressoBackup] = useState(null);

  const assinatura = fechamento?.assinatura || null;
  const mesCorrente = competencia === competenciaAtual();

  const gerar = async () => {
    setGerando(true);
    try {
      // O jsPDF só é baixado neste momento — mantém a abertura do app leve.
      const { gerarRelatorioPDF } = await import('../services/pdf.js');
      const r = await gerarRelatorioPDF({ perfil, competencia, resumo, assinatura });
      setPdf(r);
      return r;
    } catch (e) {
      console.error(e);
      avisar('Não foi possível gerar o PDF.');
      return null;
    } finally {
      setGerando(false);
    }
  };

  /* Sempre que a assinatura muda, o PDF em memória fica desatualizado. */
  useEffect(() => { setPdf(null); }, [assinatura, competencia, resumo.total]);

  const texto = `Relatório de jornada — ${perfil?.nome || ''}, matrícula ${perfil?.matricula || ''} — ${nomeCompetencia(competencia)}. `
    + `Normais ${horasCurto(resumo.totalNormais)}, extras ${horasCurto(resumo.totalExtras)}, total ${horasCurto(resumo.total)}.`;

  const comPdf = async (acao) => {
    const r = pdf || (await gerar());
    if (r) acao(r);
  };

  return (
    <>
      <TopBar titulo="Relatório" subtitulo={`${nomeCompetencia(competencia)} · ${periodoCurto(competencia)}`} voltar={voltar} />

      <div className="screen">
        <div className="pull-up">
          <div className="card">
            <div className="spread">
              <span className="card-title" style={{ margin: 0 }}>Resumo da competência</span>
              {competenciaFechada
                ? <span className="tag tag-green">Fechada</span>
                : <span className="tag tag-orange">Aberta</span>}
            </div>

            <div className="kv"><span>Agente</span><b style={{ fontFamily: 'var(--font-body)' }}>{perfil?.nome || '—'}</b></div>
            <div className="kv"><span>Matrícula</span><b>{perfil?.matricula || '—'}</b></div>
            <div className="kv"><span>Unidade</span><b style={{ fontFamily: 'var(--font-body)' }}>{perfil?.unidade || '—'}</b></div>
            <div className="kv"><span>Horas normais</span><b style={{ color: 'var(--green)' }}>{horasCurto(resumo.totalNormais)} / {CARGA_MENSAL}h</b></div>
            <div className="kv">
              <span>Horas extras</span>
              <b style={{ color: resumo.estourouExtras ? 'var(--red)' : 'var(--orange)' }}>
                {horasCurto(resumo.totalExtras)} / {LIMITE_EXTRA}h
              </b>
            </div>
            <div className="kv"><span>Dias trabalhados</span><b>{resumo.diasTrabalhados}</b></div>
            <div className="kv"><span>Total trabalhado</span><b>{horasCurto(resumo.total)}</b></div>
          </div>
        </div>

        {!resumo.itens.length && (
          <div className="alert alert-orange mt-14">
            <IcoAlert size={19} style={{ flex: 'none' }} />
            <div><b>Mês sem lançamentos</b>O relatório sairia em branco. Registre as jornadas antes de fechar.</div>
          </div>
        )}

        {/* -------------------------------------------------- Fechamento */}
        <div className="section-title">1. Fechar a competência</div>

        {competenciaFechada ? (
          <div className="card">
            <div className="alert alert-green" style={{ marginBottom: 14 }}>
              <IcoCheck size={19} style={{ flex: 'none' }} />
              <div>
                <b>Competência fechada</b>
                Fechada em {new Date(fechamento.fechadaEm).toLocaleDateString('pt-BR')}. Os lançamentos ficaram travados.
              </div>
            </div>
            <button className="btn btn-navy" onClick={() => setPedindoBackup(true)}>
              <IcoShield size={18} /> Fazer backup deste mês
            </button>
            <button className="btn btn-ghost mt-14" onClick={async () => {
              await reabrirCompetencia(competencia);
              avisar('Competência reaberta para edição.');
            }}>Reabrir para corrigir</button>
          </div>
        ) : (
          <div className="card">
            <p className="hint" style={{ marginTop: 0 }}>
              Ao fechar, os lançamentos do mês ficam travados contra alteração acidental.
              {mesCorrente && ' Este mês ainda está em curso — feche só quando terminar a escala.'}
            </p>
            <button className="btn btn-navy mt-14" onClick={() => setConfirmandoFechar(true)} disabled={!resumo.itens.length}>
              <IcoShield size={18} /> Fechar {nomeCompetencia(competencia)}
            </button>
          </div>
        )}

        {/* -------------------------------------------------- Assinatura */}
        <div className="section-title">2. Autenticar o documento</div>
        <div className="card">
          {assinatura ? (
            <>
              <div className="alert alert-green" style={{ marginBottom: 14 }}>
                <IcoCheck size={19} style={{ flex: 'none' }} />
                <div>
                  <b>Documento autenticado</b>
                  {{ pin: 'PIN pessoal', selfie: 'Selfie', biometria: 'Biometria do aparelho' }[assinatura.metodo]}
                  {' · '}{new Date(assinatura.assinadoEm).toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="kv"><span>Código de autenticação</span><b style={{ color: 'var(--gold)' }}>{assinatura.selo}</b></div>
              {assinatura.selfie && (
                <img src={assinatura.selfie} alt="Selfie da autenticação" className="selfie-preview mt-14" style={{ maxWidth: 140 }} />
              )}
              <button className="btn btn-ghost mt-14" onClick={() => setAssinando(true)}>Assinar de novo</button>
            </>
          ) : (
            <>
              <p className="hint" style={{ marginTop: 0 }}>
                A assinatura não libera o relatório — ele já é seu. Ela serve para provar ao comando que o PDF saiu do seu aparelho.
              </p>
              <button className="btn btn-primary mt-14" onClick={() => setAssinando(true)}>
                <IcoLock size={18} /> Assinar relatório
              </button>
            </>
          )}
        </div>

        {/* -------------------------------------------------------- PDF */}
        <div className="section-title">3. Gerar e enviar</div>
        <div className="card">
          <button className="btn btn-navy" onClick={() => comPdf((r) => avisar(`PDF pronto: ${r.nomeArquivo}`))} disabled={gerando}>
            <IcoDoc size={18} /> {gerando ? 'Gerando…' : pdf ? 'PDF gerado' : 'Gerar PDF'}
          </button>

          <div className="grid-2 mt-14">
            <button className="btn btn-green btn-sm" style={{ width: '100%' }}
              onClick={() => comPdf(async (r) => {
                const via = await compartilharPDF(r.blob, r.nomeArquivo, texto);
                if (via === 'baixado') { abrirWhatsApp(texto); avisar('PDF salvo. Anexe no WhatsApp.'); }
              })}>
              <IcoWhatsApp size={17} /> WhatsApp
            </button>

            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
              onClick={() => comPdf((r) => {
                baixarArquivo(r.blob, r.nomeArquivo);
                abrirEmail(`Relatório de jornada — ${nomeCompetencia(competencia)}`, texto);
              })}>
              <IcoMail size={17} /> E-mail
            </button>

            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
              onClick={() => comPdf((r) => { baixarArquivo(r.blob, r.nomeArquivo); avisar('PDF salvo no aparelho.'); })}>
              <IcoDownload size={17} /> Salvar
            </button>

            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
              onClick={() => comPdf((r) => imprimirPDF(r.blob))}>
              <IcoPrint size={17} /> Imprimir
            </button>
          </div>

          <button className="btn btn-ghost mt-14"
            onClick={() => comPdf(async (r) => { await compartilharPDF(r.blob, r.nomeArquivo, texto); })}>
            <IcoShare size={18} /> Outros aplicativos
          </button>
        </div>
      </div>

      {confirmandoFechar && (
        <Sheet titulo="Fechar competência?" subtitulo={nomeCompetencia(competencia)} fechar={() => setConfirmandoFechar(false)}>
          <div className="alert alert-blue">
            <div>
              <b>O que acontece</b>
              Os {resumo.itens.length} lançamentos do mês ficam travados. Você pode reabrir a qualquer momento se precisar corrigir.
            </div>
          </div>
          <div className="kv"><span>Normais</span><b>{horasCurto(resumo.totalNormais)}</b></div>
          <div className="kv"><span>Extras</span><b>{horasCurto(resumo.totalExtras)}</b></div>
          <div className="kv"><span>Total</span><b>{horasCurto(resumo.total)}</b></div>
          <button className="btn btn-navy mt-20" onClick={async () => {
            await fecharCompetencia(competencia, resumo);
            setConfirmandoFechar(false);
            setPedindoBackup(true);
            /* Mês fechado é prova: sobe para o Drive na hora, sem esperar
               o guarda lembrar. Se falhar, não atrapalha — segue offline. */
            sincronizar();
          }}>Confirmar fechamento</button>
          <button className="btn btn-ghost mt-14" onClick={() => setConfirmandoFechar(false)}>Cancelar</button>
        </Sheet>
      )}

      {pedindoBackup && (
        <Sheet
          titulo="Competência fechada"
          subtitulo={`Guarde ${nomeCompetencia(competencia)} fora do celular`}
          fechar={() => { setPedindoBackup(false); setProgressoBackup(null); }}
        >
          <div className="alert alert-orange">
            <IcoAlert size={19} style={{ flex: 'none' }} />
            <div>
              <b>Este mês só existe aqui dentro</b>
              O app não usa servidor. Se o aparelho quebrar ou sumir, estas
              {' '}{horasCurto(resumo.total)} vão junto. O backup completo leva os
              lançamentos e os arquivos da gaveta num pacote só.
            </div>
          </div>

          {progressoBackup && (
            <div className="alert alert-blue">
              <div><b>Preparando o pacote</b>{progressoBackup}</div>
            </div>
          )}

          <button className="btn btn-navy" disabled={!!progressoBackup} onClick={async () => {
            try {
              const r = await baixarBackupCompleto(setProgressoBackup);
              setPedindoBackup(false);
              avisar(`Backup ${r.via}: ${r.nome}`);
            } catch (e) {
              avisar(e?.message || 'Não consegui gerar o backup.');
            } finally {
              setProgressoBackup(null);
            }
          }}>
            <IcoShield size={18} /> {progressoBackup ? 'Gerando…' : 'Fazer backup agora'}
          </button>

          <p className="hint">
            Mande o arquivo para o seu e-mail ou salve no Google Drive. Para
            restaurar num aparelho novo: Ajustes → Restaurar backup.
          </p>

          <button className="btn btn-ghost" disabled={!!progressoBackup}
            onClick={() => setPedindoBackup(false)}>
            Depois eu faço
          </button>
        </Sheet>
      )}

      {assinando && (
        <Assinatura
          perfil={perfil}
          competencia={competencia}
          resumo={resumo}
          fechar={() => setAssinando(false)}
          aoAssinar={async (dados) => {
            await registrarAssinatura(competencia, dados);
            setAssinando(false);
            avisar('Relatório autenticado.');
          }}
        />
      )}
    </>
  );
}

/* ====================================================================== */
/*  Assinatura: PIN, selfie ou biometria                                   */
/* ====================================================================== */

function Assinatura({ perfil, competencia, resumo, fechar, aoAssinar }) {
  const [metodo, setMetodo] = useState(null);
  const [temBio, setTemBio] = useState(false);

  useEffect(() => { biometriaDisponivel().then(setTemBio); }, []);

  const concluir = async (tipo, selfie = null) => {
    const selo = await gerarSelo({
      matricula: perfil?.matricula, competencia, totalHoras: resumo.total, metodo: tipo
    });
    aoAssinar({ metodo: tipo, selo, selfie, assinadoEm: Date.now() });
  };

  if (metodo === 'pin') return <AssinaturaPin voltar={() => setMetodo(null)} fechar={fechar} concluir={() => concluir('pin')} />;
  if (metodo === 'selfie') return <AssinaturaSelfie fechar={fechar} voltar={() => setMetodo(null)} concluir={(foto) => concluir('selfie', foto)} />;
  if (metodo === 'biometria') return <AssinaturaBiometria perfil={perfil} fechar={fechar} voltar={() => setMetodo(null)} concluir={() => concluir('biometria')} />;

  return (
    <Sheet titulo="Assinar relatório" subtitulo="Escolha como autenticar o PDF antes de enviar." fechar={fechar}>
      <div className="stack-2">
        <button className="item" style={{ width: '100%' }} onClick={() => setMetodo('pin')}>
          <div className="topbar-badge" style={{ background: 'var(--surface-2)', color: 'var(--blue-500)', border: '1px solid var(--line)' }}><IcoLock size={20} /></div>
          <div className="item-main">
            <div className="t">PIN de 6 dígitos</div>
            <div className="s">Funciona em qualquer aparelho</div>
          </div>
        </button>

        <button className="item" style={{ width: '100%' }} onClick={() => setMetodo('selfie')}>
          <div className="topbar-badge" style={{ background: 'var(--surface-2)', color: 'var(--green)', border: '1px solid var(--line)' }}><IcoCamera size={20} /></div>
          <div className="item-main">
            <div className="t">Selfie</div>
            <div className="s">A foto entra no rodapé do PDF</div>
          </div>
        </button>

        <button className="item" style={{ width: '100%', opacity: temBio ? 1 : .5 }} onClick={() => temBio && setMetodo('biometria')} disabled={!temBio}>
          <div className="topbar-badge" style={{ background: 'var(--surface-2)', color: 'var(--navy-600)', border: '1px solid var(--line)' }}><IcoFinger size={20} /></div>
          <div className="item-main">
            <div className="t">Biometria do aparelho</div>
            <div className="s">{temBio ? 'Face ID ou impressão digital' : 'Indisponível neste aparelho'}</div>
          </div>
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------- PIN */

function AssinaturaPin({ fechar, voltar, concluir }) {
  const [existe, setExiste] = useState(null);
  const [etapa, setEtapa] = useState('digitar');   // digitar | confirmar
  const [pin, setPin] = useState('');
  const [primeiro, setPrimeiro] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => { pinCadastrado().then((r) => { setExiste(r); setEtapa(r ? 'digitar' : 'criar'); }); }, []);

  const digitar = (d) => {
    if (pin.length >= 6) return;
    const novo = pin + d;
    setPin(novo);
    setErro('');
    if (novo.length === 6) setTimeout(() => processar(novo), 140);
  };

  const processar = async (valor) => {
    if (etapa === 'criar') {
      setPrimeiro(valor);
      setPin('');
      setEtapa('confirmar');
      return;
    }
    if (etapa === 'confirmar') {
      if (valor !== primeiro) {
        setErro('Os PINs não bateram. Comece de novo.');
        setPin(''); setPrimeiro(''); setEtapa('criar');
        return;
      }
      await cadastrarPin(valor);
      concluir();
      return;
    }
    const ok = await validarPin(valor);
    if (ok) concluir();
    else { setErro('PIN incorreto.'); setPin(''); }
  };

  const titulos = {
    criar: 'Criar seu PIN',
    confirmar: 'Repita o PIN',
    digitar: 'Digite seu PIN'
  };

  if (existe === null) return null;

  return (
    <Sheet titulo={titulos[etapa]} subtitulo="Seis dígitos, guardados só neste aparelho." fechar={fechar}>
      <div className="pin-dots">
        {Array.from({ length: 6 }, (_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>

      {erro && <div className="alert alert-red">{erro}</div>}

      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => digitar(String(n))}>{n}</button>
        ))}
        <button className="wide" onClick={voltar}>Voltar</button>
        <button onClick={() => digitar('0')}>0</button>
        <button className="wide" onClick={() => setPin((p) => p.slice(0, -1))}>Apagar</button>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Selfie */

function AssinaturaSelfie({ fechar, voltar, concluir }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [foto, setFoto] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const stream = await abrirCameraFrontal();
        if (!vivo) { pararCamera(stream); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setErro('A câmera não foi liberada. Autorize o acesso nas permissões do navegador.');
      }
    })();
    return () => { vivo = false; pararCamera(streamRef.current); };
  }, []);

  const capturar = () => {
    if (!videoRef.current) return;
    setFoto(capturarQuadro(videoRef.current));
    pararCamera(streamRef.current);
  };

  return (
    <Sheet titulo="Selfie de autenticação" subtitulo="A foto vai no bloco de autenticação do PDF." fechar={fechar}>
      {erro ? (
        <div className="alert alert-red">{erro}</div>
      ) : foto ? (
        <img src={foto} alt="Selfie capturada" className="selfie-preview" />
      ) : (
        <video ref={videoRef} playsInline muted className="selfie-preview"
          style={{ transform: 'scaleX(-1)', background: '#000', aspectRatio: '1', objectFit: 'cover' }} />
      )}

      {foto ? (
        <>
          <button className="btn btn-primary mt-14" onClick={() => concluir(foto)}>Usar esta foto e assinar</button>
          <button className="btn btn-ghost mt-14" onClick={() => window.location.reload()}>Tirar outra</button>
        </>
      ) : (
        <button className="btn btn-primary mt-14" onClick={capturar} disabled={!!erro}>
          <IcoCamera size={18} /> Tirar foto
        </button>
      )}
      <button className="btn btn-ghost mt-14" onClick={voltar}>Voltar</button>
    </Sheet>
  );
}

/* ------------------------------------------------------------- Biometria */

function AssinaturaBiometria({ perfil, fechar, voltar, concluir }) {
  const [estado, setEstado] = useState('pronto');   // pronto | aguardando | erro
  const [erro, setErro] = useState('');

  const autenticar = async () => {
    setEstado('aguardando');
    setErro('');
    try {
      if (!(await biometriaCadastrada())) await cadastrarBiometria(perfil);
      else await validarBiometria();
      concluir();
    } catch (e) {
      setErro(e?.message || 'Não foi possível confirmar a biometria.');
      setEstado('erro');
    }
  };

  return (
    <Sheet titulo="Biometria" subtitulo="Use a digital ou o reconhecimento facial do aparelho." fechar={fechar}>
      <div className="center" style={{ padding: '18px 0' }}>
        <div style={{ color: 'var(--blue-500)' }}><IcoFinger size={72} weight={1.5} /></div>
        <p className="hint" style={{ maxWidth: 280, margin: '12px auto 0' }}>
          {estado === 'aguardando' ? 'Confirme no aparelho…' : 'Toque em confirmar e apresente sua digital ou rosto.'}
        </p>
      </div>

      {erro && <div className="alert alert-red">{erro}</div>}

      <button className="btn btn-primary" onClick={autenticar} disabled={estado === 'aguardando'}>
        {estado === 'aguardando' ? 'Aguardando…' : 'Confirmar identidade'}
      </button>
      <button className="btn btn-ghost mt-14" onClick={voltar}>Voltar</button>
    </Sheet>
  );
}
