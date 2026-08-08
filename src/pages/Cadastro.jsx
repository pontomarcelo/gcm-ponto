import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { LOGO } from '../components/UI.jsx';
import { IcoClose } from '../components/Icons.jsx';
import { CARGA_MENSAL, LIMITE_EXTRA } from '../services/calc.js';

const VAZIO = { nome: '', matricula: '', municipio: '', unidade: '' };

export default function Cadastro({ aoConcluir, inicial = null }) {
  const { salvarPerfil, avisar } = useApp();
  const [form, setForm] = useState(inicial ? { ...VAZIO, ...inicial } : VAZIO);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErros((x) => ({ ...x, [k]: null }));
  };

  const validar = () => {
    const e = {};
    if (form.nome.trim().length < 3) e.nome = 'Escreva o nome completo.';
    if (!form.matricula.trim()) e.matricula = 'Informe a matrícula.';
    if (!form.municipio.trim()) e.municipio = 'Informe o município.';
    if (!form.unidade.trim()) e.unidade = 'Informe a unidade.';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const enviar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      await salvarPerfil({
        nome: form.nome.trim(),
        matricula: form.matricula.trim(),
        municipio: form.municipio.trim(),
        unidade: form.unidade.trim()
      });
      avisar(inicial ? 'Dados atualizados.' : 'Cadastro concluído.');
      aoConcluir?.();
    } catch {
      avisar('Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const campo = (k, rotulo, placeholder, extra = {}) => (
    <div className="field">
      <label htmlFor={k}>{rotulo}</label>
      <input id={k} className="input" value={form[k]} onChange={set(k)} placeholder={placeholder}
        style={erros[k] ? { borderColor: 'var(--red)' } : undefined} {...extra} />
      {erros[k] && <div className="hint" style={{ color: 'var(--red)' }}>{erros[k]}</div>}
    </div>
  );

  return (
    <div className="onboard">
      {/* Editando os dados, o guarda precisa de saída no topo — não só do
          Cancelar lá embaixo, que exige rolar a tela inteira.
          No primeiro cadastro não há X: ainda não existe para onde voltar. */}
      {inicial && (
        <div className="onboard-topo">
          <button className="onboard-fechar" onClick={() => aoConcluir?.()} aria-label="Fechar sem salvar">
            <IcoClose size={20} />
          </button>
        </div>
      )}

      <div className="brand">
        <img src={LOGO} alt="Brasão da Guarda Municipal" />
        <h2>{inicial ? 'Seus dados' : 'Bem-vindo, guarda'}</h2>
        <p className="lead">
          {inicial
            ? 'Altere o que precisar. Os dados aparecem no cabeçalho do relatório.'
            : 'Preencha uma vez. Fica salvo no aparelho e vai no cabeçalho de todo relatório.'}
        </p>
      </div>

      {campo('nome', 'Nome completo', 'Ex.: João Batista de Sousa', { autoComplete: 'name' })}
      {campo('matricula', 'Matrícula', 'Ex.: 2317', { inputMode: 'text' })}
      {campo('municipio', 'Município', 'Ex.: Itapajé — CE')}
      {campo('unidade', 'Unidade', 'Ex.: Base Central')}

      <div className="alert alert-blue mt-14">
        <div>
          <b>Como a contagem funciona</b>
          {CARGA_MENSAL}h de carga mensal e teto de {LIMITE_EXTRA}h extras. Passou das {CARGA_MENSAL}h, o app vira o restante em hora extra sozinho.
        </div>
      </div>

      <button className="btn btn-primary mt-14" onClick={enviar} disabled={salvando}>
        {salvando ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Começar a usar'}
      </button>

      {inicial && (
        <button className="btn btn-ghost mt-14" onClick={() => aoConcluir?.()}>Cancelar</button>
      )}
    </div>
  );
}
