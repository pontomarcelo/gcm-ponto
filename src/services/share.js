/**
 * GCM Ponto — Envio do relatório.
 * Separado do gerador de PDF de propósito: estas funções são leves e o
 * jsPDF só é baixado quando o guarda realmente gera o documento.
 */

export function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Usa a folha de compartilhamento do celular (WhatsApp, e-mail, Drive...). */
export async function compartilharPDF(blob, nome, texto) {
  const file = new File([blob], nome, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: nome, text: texto });
    return 'compartilhado';
  }
  baixarArquivo(blob, nome);
  return 'baixado';
}

export function abrirWhatsApp(texto) {
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}

export function abrirEmail(assunto, corpo) {
  window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

export function imprimirPDF(blob) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) w.onload = () => w.print();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
