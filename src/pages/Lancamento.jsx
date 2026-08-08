import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Sheet } from '../components/UI.jsx';
import {
  TIPOS, tipoPorId, duracaoHoras, horasCurto, hojeISO, competenciaDe,
  simular, formatarDataExtenso, CARGA_MENSAL, LIMITE_EXTRA, novoId,
  somarDias, diasDeVirada, formatarData
} from '../services/calc.js';
import { IcoTrash, IcoCopy } from '../components/Icons.jsx';

const vazio = (data) => {
  const d = data || hojeISO();
  return {
    id: null, data: d, dataSaida: d, entrada: '07:00', saida: '13:00',
    tipo: 'ordinaria', comandante: '', local: '', observacao: '', justificativa: ''
  };
};

export default function Lancamento({ registro, dataSugerida, fechar }) {
  const {
    lancamentos, salvarLancamento, excluirLancamento, duplicarLancamento,
    avisar, fechamentos, setCompetencia
  } = useApp();

  const [form, setForm] = useState(() => {
    if (!registro) return vazio(dataSugerida);
    const base = { ...vazio(), ...registro };
    // lançamento gravado antes do campo existir: preserva o resultado que ele já tinha
    if (!registro.dataSaida) {
      const virou = registro.entrada && registro.saida && registro.saida <= registro.entrada;
      base.dataSaida = virou ? somarDias(registro.data, 1) : registro.data;
    }
    return base;
  });
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* Trocar de tipo pode desligar campos: o que sumiu da tela também sai do registro. */
  const trocarTipo = (novo) => {
    setForm((f) => {
      const t = tipoPorId(novo);
      return {
        ...f,
        tipo: novo,
        dataSaida: t.doisDias ? f.dataSaida : f.data,
        comandante: t.responsavel ? f.comandante : '',
        local: t.local ? f.local : '',
        observacao: t.observacao ? f.observacao : '',
        justificativa: t.justificativa ? f.justificativa : ''
      };
    });
  };

  const mudarDataEntrada = (e) => {
    const nova = e.target.value;
    setForm((f) => {
      const virada = diasDeVirada(f.data, f.dataSaida);
      return { ...f, data: nova, dataSaida: nova ? somarDias(nova, virada) : nova };
    });
  };

  const alternarDiaSeguinte = () => {
    setForm((f) => ({
      ...f,
      dataSaida: diasDeVirada(f.data, f.dataSaida) > 0 ? f.data : somarDias(f.data, 1)
    }));
  };

  const compAlvo = competenciaDe(form.data);
  const mesFechado = !!fechamentos.find((c) => c.id === compAlvo)?.fechada;
  const cfg = tipoPorId(form.tipo);
  const conta = cfg.temHorario;
  const horas = conta ? duracaoHoras(form.entrada, form.saida, form.data, form.dataSaida) : 0;
  const virada = diasDeVirada(form.data, form.dataSaida);
  const viraNoite = conta && virada > 0;
  const saidaInvalida = conta && form.entrada && form.saida && horas === 0;

  /* Prévia: mostra a divisão antes de gravar. */
  const previa = useMemo(() => {
    const daComp = lancamentos.filter((l) => l.competencia === compAlvo);
    const candidato = { ...form, id: form.id || '__previa__', competencia: compAlvo };
    return simular(daComp, candidato);
  }, [form, lancamentos, compAlvo]);

  const item = previa.item;
  const jaEstourou = previa.depois.totalExtras > LIMITE_EXTRA;

  const salvar = async () => {
    if (!form.data) return avisar('Escolha a data.');
    if (conta && (!form.entrada || !form.saida)) return avisar('Informe entrada e saída.');
    if (conta && horas === 0) return avisar('A saída precisa vir depois da entrada. Marque "Saída no dia seguinte" se o turno virou a madrugada.');
    if (mesFechado) return avisar('Competência fechada. Reabra em Ajustes para editar.');

    setSalvando(true);
    try {
      await salvarLancamento(form);
      setCompetencia(compAlvo);
      avisar(form.id ? 'Lançamento atualizado.' : 'Jornada registrada.');
      fechar();
    } catch {
      avisar('Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    await excluirLancamento(form.id);
    avisar('Lançamento excluído.');
    fechar();
  };

  const duplicar = async () => {
    await duplicarLancamento({ ...form, id: novoId() });
    avisar('Lançamento duplicado. Ajuste a data da cópia no histórico.');
    fechar();
  };

  return (
    <Sheet
      titulo={form.id ? 'Editar jornada' : 'Nova jornada'}
      subtitulo={form.data ? formatarDataExtenso(form.data) : 'Registre entrada e saída do serviço'}
      fechar={fechar}
    >
      {mesFechado && (
        <div className="alert alert-red">
          <div><b>Competência fechada</b>Este mês já foi fechado. Reabra em Ajustes para lançar ou editar.</div>
        </div>
      )}

      <div className="field">
        <label>Tipo de serviço</label>
        <div className="chips">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" className={`chip ${form.tipo === t.id ? 'on' : ''}`}
              onClick={() => trocarTipo(t.id)}>
              {t.nome}
            </button>
          ))}
        </div>
      </div>

      {!conta ? (
        <div className="field">
          <label htmlFor="data">Data</label>
          <input id="data" type="date" className="input" value={form.data} onChange={mudarDataEntrada} />
        </div>
      ) : !cfg.doisDias ? (
        <>
          <div className="field">
            <label htmlFor="data">Data</label>
            <input id="data" type="date" className="input" value={form.data} onChange={mudarDataEntrada} />
          </div>
          <div className="row-2">
            <div className="field">
              <label htmlFor="entrada">Hora de entrada</label>
              <input id="entrada" type="time" className="input" value={form.entrada} onChange={set('entrada')} />
            </div>
            <div className="field">
              <label htmlFor="saida">Hora de saída</label>
              <input id="saida" type="time" className="input" value={form.saida} onChange={set('saida')} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="section-title" style={{ marginTop: 4 }}>Entrada</div>
          <div className="row-2">
            <div className="field">
              <label htmlFor="data">Data</label>
              <input id="data" type="date" className="input" value={form.data} onChange={mudarDataEntrada} />
            </div>
            <div className="field">
              <label htmlFor="entrada">Hora</label>
              <input id="entrada" type="time" className="input" value={form.entrada} onChange={set('entrada')} />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 4 }}>Saída</div>
          <div className="row-2">
            <div className="field">
              <label htmlFor="dataSaida">Data</label>
              <input id="dataSaida" type="date" className="input" value={form.dataSaida}
                min={form.data} onChange={set('dataSaida')} />
            </div>
            <div className="field">
              <label htmlFor="saida">Hora</label>
              <input id="saida" type="time" className="input" value={form.saida} onChange={set('saida')} />
            </div>
          </div>

          <button type="button" className={`chip ${virada > 0 ? 'on' : ''}`}
            onClick={alternarDiaSeguinte} style={{ marginBottom: 14 }}>
            {virada > 0 ? '✓ Saída no dia seguinte' : 'Saída no dia seguinte'}
          </button>
        </>
      )}

      {viraNoite && (
        <div className="alert alert-blue">
          <div>
            <b>Turno que atravessa a madrugada</b>
            De {formatarData(form.data)} às {form.entrada} até {formatarData(form.dataSaida)} às {form.saida}: {horasCurto(horas)}.
          </div>
        </div>
      )}

      {saidaInvalida && (
        <div className="alert alert-red">
          <div>
            <b>A saída não vem depois da entrada</b>
            {cfg.doisDias
              ? <>Corrija a hora ou marque <b style={{ display: 'inline' }}>Saída no dia seguinte</b>.</>
              : <>Na {cfg.nome.toLowerCase()} o serviço começa e termina no mesmo dia.</>}
          </div>
        </div>
      )}

      {/* Prévia do rateio — o coração da regra das 135h */}
      {conta && horas > 0 && (
        <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 14 }}>
          <div className="spread" style={{ marginBottom: 10 }}>
            <span className="card-title" style={{ margin: 0 }}>Como vai contar</span>
            <b className="num" style={{ fontSize: 18 }}>{horasCurto(horas)}</b>
          </div>

          {cfg.convocada && (
            <div className="alert alert-orange" style={{ marginBottom: 14 }}>
              <div>
                <b>Extra convocada pelo comando</b>
                As {horasCurto(horas)} entram integralmente como hora extra e não abatem
                as {CARGA_MENSAL}h regulamentares. Consomem {horasCurto(horas)} do teto de {LIMITE_EXTRA}h.
              </div>
            </div>
          )}

          {!cfg.contaJornada && (
            <div className="alert alert-blue" style={{ marginBottom: 0 }}>
              <div>
                <b>Fora do cálculo da folha</b>
                {cfg.nome} é paga à parte: estas {horasCurto(horas)} ficam registradas e vão no
                relatório, mas não abatem as {CARGA_MENSAL}h nem consomem as {LIMITE_EXTRA}h de extra.
              </div>
            </div>
          )}

          {cfg.contaJornada && item?.dividido ? (
            <div className="alert alert-orange" style={{ marginBottom: 10 }}>
              <div>
                <b>Divisão automática</b>
                Faltavam {horasCurto(item.horasNormais)} para fechar as {CARGA_MENSAL}h.
                Este lançamento entra como {horasCurto(item.horasNormais)} normais + {horasCurto(item.horasExtras)} extras.
              </div>
            </div>
          ) : null}

          {cfg.contaJornada && (
          <>
          <div className="grid-2">
            <div className="metric accent-green" style={{ boxShadow: 'none' }}>
              <div className="k">{cfg.convocada ? 'Abate da carga' : 'Normais'}</div>
              <div className="v" style={{ color: 'var(--green)' }}>{horasCurto(item?.horasNormais || 0)}</div>
            </div>
            <div className="metric accent-orange" style={{ boxShadow: 'none' }}>
              <div className="k">Extras</div>
              <div className="v" style={{ color: item?.horasExcedentes > 0 ? 'var(--red)' : 'var(--orange)' }}>
                {horasCurto(item?.horasExtras || 0)}
              </div>
            </div>
          </div>

          <div className="divider" />
          <div className="kv">
            <span>Acumulado normais no mês</span>
            <b>{horasCurto(previa.depois.totalNormais)} / {CARGA_MENSAL}h</b>
          </div>
          <div className="kv">
            <span>Acumulado extras no mês</span>
            <b style={{ color: jaEstourou ? 'var(--red)' : undefined }}>
              {horasCurto(previa.depois.totalExtras)} / {LIMITE_EXTRA}h
            </b>
          </div>
          </>
          )}
        </div>
      )}

      {cfg.responsavel && (
        <div className="field">
          <label htmlFor="comandante">{cfg.responsavel}</label>
          <input id="comandante" className="input" value={form.comandante} onChange={set('comandante')}
            placeholder={cfg.responsavel} list="lista-comandantes" />
          <datalist id="lista-comandantes">
            {[...new Set(lancamentos.map((l) => l.comandante).filter(Boolean))].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      )}

      {cfg.local && (
        <div className="field">
          <label htmlFor="local">Local</label>
          <input id="local" className="input" value={form.local} onChange={set('local')}
            placeholder="Onde a escala foi retirada" list="lista-locais" />
          <datalist id="lista-locais">
            {[...new Set(lancamentos.map((l) => l.local).filter(Boolean))].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      )}

      {cfg.justificativa && (
        <div className="field">
          <label htmlFor="justificativa">Justificativa</label>
          <textarea id="justificativa" className="textarea" value={form.justificativa} onChange={set('justificativa')}
            placeholder="Motivo da escala e quem determinou" />
        </div>
      )}

      {cfg.observacao && (
        <div className="field">
          <label htmlFor="observacao">Observação</label>
          <textarea id="observacao" className="textarea" value={form.observacao} onChange={set('observacao')}
            placeholder="Ocorrências, apoio prestado, viatura…" />
        </div>
      )}

      <button className="btn btn-primary" onClick={salvar} disabled={salvando || mesFechado}>
        {salvando ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Registrar jornada'}
      </button>

      {form.id && (
        <div className="row-2 mt-14">
          <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={duplicar}>
            <IcoCopy size={17} /> Duplicar
          </button>
          <button className="btn btn-danger btn-sm" style={{ width: '100%' }}
            onClick={() => setConfirmandoExclusao(true)} disabled={mesFechado}>
            <IcoTrash size={17} /> Excluir
          </button>
        </div>
      )}

      {confirmandoExclusao && (
        <div className="alert alert-red mt-14">
          <div style={{ width: '100%' }}>
            <b>Excluir esta jornada?</b>
            O mês inteiro será recalculado. Não dá para desfazer.
            <div className="row-2 mt-14">
              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
                onClick={() => setConfirmandoExclusao(false)}>Manter</button>
              <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={excluir}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
