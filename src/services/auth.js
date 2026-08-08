/**
 * GCM Ponto — Autenticação da assinatura.
 *
 * Importante: a assinatura NÃO libera o relatório. O relatório é do guarda e
 * sempre pode ser gerado. A assinatura serve só para autenticar o PDF antes
 * de enviar ao comando.
 *
 * Três formas: PIN de 6 dígitos, selfie e biometria do aparelho.
 */

import { getConfig, setConfig } from './db.js';

const enc = new TextEncoder();

async function sha256(texto) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* -------------------------------------------------------------------- PIN */

export async function pinCadastrado() {
  return !!(await getConfig('pin'));
}

export async function cadastrarPin(pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error('O PIN precisa ter 6 dígitos.');
  const salt = crypto.randomUUID();
  const hash = await sha256(salt + pin);
  await setConfig('pin', { salt, hash, criadoEm: Date.now() });
  return true;
}

export async function validarPin(pin) {
  const guardado = await getConfig('pin');
  if (!guardado) return false;
  return (await sha256(guardado.salt + pin)) === guardado.hash;
}

export async function removerPin() {
  await setConfig('pin', null);
}

/* -------------------------------------------------------------- Biometria */

export function biometriaSuportada() {
  return typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials;
}

export async function biometriaDisponivel() {
  if (!biometriaSuportada()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

const bufParaB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64ParaBuf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Registra a digital / Face ID do aparelho para uso na assinatura. */
export async function cadastrarBiometria(perfil) {
  if (!(await biometriaDisponivel())) throw new Error('Este aparelho não oferece biometria para aplicativos.');

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'GCM Ponto' },
      user: {
        id: userId,
        name: perfil?.matricula || 'guarda',
        displayName: perfil?.nome || 'Guarda Municipal'
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none'
    }
  });

  if (!cred) throw new Error('Não foi possível cadastrar a biometria.');
  await setConfig('biometria', { id: bufParaB64(cred.rawId), criadoEm: Date.now() });
  return true;
}

export async function biometriaCadastrada() {
  return !!(await getConfig('biometria'));
}

/** Pede a biometria. Devolve true se o aparelho confirmou a identidade. */
export async function validarBiometria() {
  const guardada = await getConfig('biometria');
  if (!guardada) throw new Error('Nenhuma biometria cadastrada.');

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: b64ParaBuf(guardada.id), transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000
    }
  });
  return !!assertion;
}

export async function removerBiometria() {
  await setConfig('biometria', null);
}

/* ----------------------------------------------------------------- Selfie */

/** Abre a câmera frontal e devolve um <video> pronto para captura. */
export async function abrirCameraFrontal() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador não dá acesso à câmera.');
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
    audio: false
  });
}

/** Captura o quadro atual do vídeo como JPEG quadrado. */
export function capturarQuadro(video, lado = 480) {
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d');
  const { videoWidth: w, videoHeight: h } = video;
  const corte = Math.min(w, h);
  ctx.drawImage(video, (w - corte) / 2, (h - corte) / 2, corte, corte, 0, 0, lado, lado);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function pararCamera(stream) {
  stream?.getTracks?.().forEach((t) => t.stop());
}

/* -------------------------------------------------------------- Selo do PDF */

/** Código de autenticação impresso no rodapé do relatório assinado. */
export async function gerarSelo({ matricula, competencia, totalHoras, metodo }) {
  const base = `${matricula}|${competencia}|${totalHoras}|${metodo}|${Date.now()}`;
  const hash = await sha256(base);
  return hash.slice(0, 24).toUpperCase().match(/.{1,6}/g).join('-');
}
