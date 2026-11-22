// Motor de áudio resiliente para iOS 17/18 WebKit (Safari & PWA) + Android/Desktop
// Suporta:
// 1. Mixagem com apps de música em 2º plano (Deezer/Spotify) via navigator.audioSession ('ambient' na contagem -> 'transient' ducking no alarme)
// 2. Recuperação automática do estado 'interrupted' (exclusivo do iOS WebKit ao gravar tela / alternar para WhatsApp) e 'suspended'
// 3. Keep-alive sub-audível (-90 dBFS LSB dither não-zero) que impede o iOS de congelar o cronômetro quando o usuário vai ao WhatsApp
// 4. Desbloqueio real (.play()) de HTMLAudioElement + AudioContext dentro do gesto do usuário

let sharedAudioCtx = null;
let sharedWavAudio = null;
let keepAliveAudio = null;
let keepAliveOsc = null;
let keepAliveGain = null;
let hasUserInteracted = false;
let isWavBlessed = false;
let isKeepAliveActive = false;
let silentWavUriCache = null;
let alarmWavUriCache = null;

function setAudioSessionType(type) {
  try {
    if (typeof navigator !== 'undefined' && navigator.audioSession) {
      navigator.audioSession.type = type;
    }
  } catch {
    // Ignora caso o navegador não suporte determinado tipo de audioSession
  }
}

/**
 * Gera um WAV mono de 0.5s com dither LSB (±1 em 16-bit PCM = -90 dBFS):
 * totalmente inaudível ao ouvido humano, mas impede que o detector de silêncio digital
 * do iOS CoreAudio suspenda a aba em segundo plano enquanto o usuário está no WhatsApp.
 */
function getSilentKeepAliveWavDataUri() {
  if (silentWavUriCache) return silentWavUriCache;
  const sampleRate = 8000;
  const durationSec = 0.5;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, i % 2 === 0 ? 1 : -1, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  silentWavUriCache = 'data:audio/wav;base64,' + btoa(binary);
  return silentWavUriCache;
}

/**
 * Gera um WAV de alarme de alto contraste acústico (3 bipes duplos harmônicos:
 * 880/1760 Hz -> 1174.66/2349.32 Hz -> 1318.5/2637 Hz, amplitude 0.92)
 * projetado para cortar com clareza sobre músicas do Deezer/Spotify.
 */
function getAlarmWavDataUri() {
  if (alarmWavUriCache) return alarmWavUriCache;
  const sampleRate = 22050;
  const durationSec = 0.72;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    if (t < 0.16) {
      const env = Math.min(1, t / 0.008) * Math.min(1, (0.16 - t) / 0.025);
      const f1 = Math.sin(2 * Math.PI * 880 * t);
      const f2 = Math.sin(2 * Math.PI * 1760 * t) * 0.45;
      sample = (f1 + f2) * 0.64 * env;
    } else if (t >= 0.21 && t < 0.39) {
      const t2 = t - 0.21;
      const env = Math.min(1, t2 / 0.008) * Math.min(1, (0.18 - t2) / 0.025);
      const f1 = Math.sin(2 * Math.PI * 1174.66 * t);
      const f2 = Math.sin(2 * Math.PI * 2349.32 * t) * 0.45;
      sample = (f1 + f2) * 0.66 * env;
    } else if (t >= 0.44 && t < 0.68) {
      const t3 = t - 0.44;
      const env = Math.min(1, t3 / 0.008) * Math.min(1, (0.24 - t3) / 0.035);
      const f1 = Math.sin(2 * Math.PI * 1318.51 * t);
      const f2 = Math.sin(2 * Math.PI * 2637.02 * t) * 0.45;
      sample = (f1 + f2) * 0.68 * env;
    }
    const pcm = Math.max(-0.95, Math.min(0.95, sample));
    view.setInt16(44 + i * 2, pcm < 0 ? pcm * 0x8000 : pcm * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  alarmWavUriCache = 'data:audio/wav;base64,' + btoa(binary);
  return alarmWavUriCache;
}

function ensureAudioElements() {
  if (typeof Audio === 'undefined') return;
  if (!sharedWavAudio) {
    sharedWavAudio = new Audio(getAlarmWavDataUri());
    sharedWavAudio.volume = 1.0;
    sharedWavAudio.preload = 'auto';
    sharedWavAudio.playsInline = true;
    sharedWavAudio.setAttribute?.('playsinline', 'true');
  }
  if (!keepAliveAudio) {
    keepAliveAudio = new Audio(getSilentKeepAliveWavDataUri());
    keepAliveAudio.volume = 0.02;
    keepAliveAudio.loop = true;
    keepAliveAudio.preload = 'auto';
    keepAliveAudio.playsInline = true;
    keepAliveAudio.setAttribute?.('playsinline', 'true');
  }
}

/**
 * Tenta tirar o AudioContext de 'suspended' OU 'interrupted' (estado exclusivo do iOS WebKit
 * quando o usuário alterna para o WhatsApp com Deezer e Gravação de Tela ativos).
 */
export async function resumeAudioFromInterruption() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx && sharedAudioCtx) {
      if (sharedAudioCtx.state !== 'running' && sharedAudioCtx.state !== 'closed') {
        await sharedAudioCtx.resume().catch(() => {});
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Deve ser chamado dentro de um handler de clique/toque real do usuário.
 * Desbloqueia tanto o AudioContext quanto os elementos <audio> no iOS WebKit.
 */
export function unlockTimerAudio() {
  hasUserInteracted = true;
  setAudioSessionType('ambient');
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        sharedAudioCtx = new AudioCtx();
        sharedAudioCtx.onstatechange = () => {
          if (
            (isKeepAliveActive || hasUserInteracted) &&
            sharedAudioCtx &&
            (sharedAudioCtx.state === 'interrupted' || sharedAudioCtx.state === 'suspended')
          ) {
            sharedAudioCtx.resume().catch(() => {});
          }
        };
      }
      if (sharedAudioCtx.state !== 'running') {
        sharedAudioCtx.resume().catch(() => {});
      }
      // Toca 1 frame silencioso para destravar o pipeline de hardware do iOS WebKit
      try {
        const silentBuf = sharedAudioCtx.createBuffer(1, 1, 22050);
        const src = sharedAudioCtx.createBufferSource();
        src.buffer = silentBuf;
        src.connect(sharedAudioCtx.destination);
        src.start(0);
      } catch {
        // ignore
      }
    }

    ensureAudioElements();

    // No iOS WebKit, .load() não basta: é necessário um .play() real dentro do gesto do usuário
    if (sharedWavAudio && !isWavBlessed) {
      sharedWavAudio.muted = true;
      const playPromise = sharedWavAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            sharedWavAudio.pause();
            sharedWavAudio.currentTime = 0;
            sharedWavAudio.muted = false;
            isWavBlessed = true;
          })
          .catch(() => {
            sharedWavAudio.muted = false;
          });
      } else {
        sharedWavAudio.pause();
        sharedWavAudio.currentTime = 0;
        sharedWavAudio.muted = false;
        isWavBlessed = true;
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Mantém a sessão de áudio 'ambient' ativa em segundo plano durante a contagem regressiva,
 * evitando que o iOS congele o cronômetro ao abrir o WhatsApp e SEM pausar o Deezer/Spotify.
 */
export function startSilentKeepAlive() {
  isKeepAliveActive = true;
  setAudioSessionType('ambient');
  try {
    ensureAudioElements();
    if (keepAliveAudio) {
      if (keepAliveAudio.src !== getSilentKeepAliveWavDataUri()) {
        keepAliveAudio.src = getSilentKeepAliveWavDataUri();
      }
      keepAliveAudio.loop = true;
      keepAliveAudio.volume = 0.02;
      keepAliveAudio.muted = false;
      if (keepAliveAudio.paused) {
        keepAliveAudio.play().catch(() => {});
      }
    }

    if (sharedAudioCtx) {
      if (sharedAudioCtx.state !== 'running' && sharedAudioCtx.state !== 'closed') {
        sharedAudioCtx.resume().catch(() => {});
      }
      if (!keepAliveOsc && sharedAudioCtx.state === 'running') {
        try {
          keepAliveOsc = sharedAudioCtx.createOscillator();
          keepAliveGain = sharedAudioCtx.createGain();
          keepAliveOsc.type = 'sine';
          keepAliveOsc.frequency.setValueAtTime(40, sharedAudioCtx.currentTime);
          keepAliveGain.gain.setValueAtTime(0.00002, sharedAudioCtx.currentTime);
          keepAliveOsc.connect(keepAliveGain);
          keepAliveGain.connect(sharedAudioCtx.destination);
          keepAliveOsc.start();
        } catch {
          keepAliveOsc = null;
          keepAliveGain = null;
        }
      }
    }
  } catch {
    // ignore
  }
}

export function stopSilentKeepAlive() {
  isKeepAliveActive = false;
  try {
    if (keepAliveOsc) {
      try {
        keepAliveOsc.stop();
        keepAliveOsc.disconnect();
      } catch {
        // ignore
      }
      keepAliveOsc = null;
    }
    if (keepAliveGain) {
      try {
        keepAliveGain.disconnect();
      } catch {
        // ignore
      }
      keepAliveGain = null;
    }
    if (keepAliveAudio) {
      keepAliveAudio.pause();
      keepAliveAudio.currentTime = 0;
      if (keepAliveAudio.src !== getSilentKeepAliveWavDataUri()) {
        keepAliveAudio.src = getSilentKeepAliveWavDataUri();
      }
    }
  } catch {
    // ignore
  }
}

export async function playAlarmBurst() {
  // Solicita 'transient' durante os bipes para o iOS fazer ducking (baixar volume do Deezer sem pausá-lo)
  setAudioSessionType('transient');

  let playedViaWebAudio = false;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        sharedAudioCtx = new AudioCtx();
      }
      // Trata tanto 'suspended' quanto 'interrupted' (iOS WebKit com Deezer + Screen Recording + WhatsApp)
      if (sharedAudioCtx.state !== 'running') {
        await sharedAudioCtx.resume().catch(() => {});
      }
      if (sharedAudioCtx.state === 'running') {
        const ctx = sharedAudioCtx;
        const notes = [
          { freq: 880, harmonic: 1760, start: 0, dur: 0.15 },
          { freq: 1174.66, harmonic: 2349.32, start: 0.20, dur: 0.16 },
          { freq: 1318.51, harmonic: 2637.02, start: 0.41, dur: 0.22 }
        ];
        notes.forEach(({ freq, harmonic, start, dur }) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'triangle';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(freq, ctx.currentTime + start);
          osc2.frequency.setValueAtTime(harmonic, ctx.currentTime + start);

          gain.gain.setValueAtTime(0.85, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(ctx.currentTime + start);
          osc2.start(ctx.currentTime + start);
          osc1.stop(ctx.currentTime + start + dur);
          osc2.stop(ctx.currentTime + start + dur);
        });
        playedViaWebAudio = true;
      }
    }
  } catch {
    playedViaWebAudio = false;
  }

  // Dispara TAMBÉM via HTMLAudioElement WAV quando em 2º plano (document.hidden) ou se o WebAudio foi interrompido pelo iOS
  const isBackgrounded = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if (!playedViaWebAudio || isBackgrounded) {
    try {
      ensureAudioElements();
      if (sharedWavAudio) {
        sharedWavAudio.muted = false;
        sharedWavAudio.volume = 1.0;
        sharedWavAudio.currentTime = 0;
        let wavPlayed = true;
        await sharedWavAudio.play().catch(() => {
          wavPlayed = false;
        });

        // Se o iOS bloquear sharedWavAudio em 2º plano, usa o keepAliveAudio que já estava em reprodução contínua!
        if (!wavPlayed && keepAliveAudio) {
          keepAliveAudio.src = getAlarmWavDataUri();
          keepAliveAudio.loop = false;
          keepAliveAudio.volume = 1.0;
          keepAliveAudio.muted = false;
          await keepAliveAudio.play().catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }
}

export function stopSharedAudio() {
  stopSilentKeepAlive();
  if (sharedWavAudio) {
    try {
      sharedWavAudio.pause();
      sharedWavAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }
  // Restaura sessão 'ambient' para que o Deezer volte a 100% do volume normal imediatamente
  setAudioSessionType('ambient');
}

export function triggerSafeVibration(pattern) {
  if (!hasUserInteracted) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    const active = navigator.userActivation ? navigator.userActivation.hasBeenActive : true;
    if (!active) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}
