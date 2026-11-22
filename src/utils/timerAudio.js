// Motor de áudio Seamless Music-First para iOS 17/18 WebKit (iPhone 15) + Android/Desktop
// Arquitetura projetada para conviver com Deezer / Spotify / YouTube Music:
// 1. Durante a contagem regressiva: NENHUM áudio é reproduzido e navigator.audioSession.type = 'ambient'
//    -> A música no Deezer/Spotify NUNCA pausa nem baixa de volume ao iniciar o cronômetro ou ir ao WhatsApp.
// 2. Quando o alarme dispara (00:00 ou ao retornar do WhatsApp):
//    -> navigator.audioSession.type muda para 'transient', fazendo FADE (ducking) automático no volume da música sem pausá-la.
//    -> sharedWavAudio.play() é acionado em TODOS os ciclos do loop (e não apenas quando WebAudio falha),
//       eliminando o bug do iOS em que um AudioContext retomado de 'interrupted' por visibilitychange ficava mudo a partir do 2º bipe.
// 3. Ao tocar em PARAR ALARME (stopSharedAudio):
//    -> O alarme para imediatamente e navigator.audioSession.type volta para 'ambient',
//       fazendo o volume do Deezer/Spotify retornar a 100% automaticamente!

let sharedAudioCtx = null;
let sharedWavAudio = null;
let activeOscillators = [];
let hasUserInteracted = false;
let isWavBlessed = false;
let alarmWavUriCache = null;
let lastBurstTimestamp = 0;

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
 * Gera em memória um WAV de alarme de alto contraste acústico (3 bipes duplos harmônicos:
 * 880/1760 Hz -> 1174.66/2349.32 Hz -> 1318.51/2637.02 Hz, amplitude 0.92, duração 0.72s)
 * projetado para se destacar com nitidez sobre a música do Deezer/Spotify em fade.
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

function ensureAlarmAudioElement() {
  if (typeof Audio === 'undefined') return null;
  if (!sharedWavAudio) {
    sharedWavAudio = new Audio(getAlarmWavDataUri());
    sharedWavAudio.volume = 1.0;
    sharedWavAudio.preload = 'auto';
    sharedWavAudio.playsInline = true;
    sharedWavAudio.setAttribute?.('playsinline', 'true');
  }
  return sharedWavAudio;
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
 * Mantém audioSession = 'ambient' para NUNCA interromper o Deezer/Spotify ao iniciar o cronômetro,
 * e abençoa o elemento <audio> WAV com um micro-play mudo na 1ª interação.
 */
export function unlockTimerAudio() {
  hasUserInteracted = true;
  setAudioSessionType('ambient');
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        sharedAudioCtx = new AudioCtx();
      }
      if (sharedAudioCtx.state !== 'running') {
        sharedAudioCtx.resume().catch(() => {});
      }
      // Toca 1 frame silencioso para destravar o AudioContext no WebKit sem interferir na música
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

    const wav = ensureAlarmAudioElement();
    if (wav && !isWavBlessed) {
      wav.muted = true;
      const playPromise = wav.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            wav.pause();
            wav.currentTime = 0;
            wav.muted = false;
            isWavBlessed = true;
          })
          .catch(() => {
            wav.muted = false;
          });
      } else {
        wav.pause();
        wav.currentTime = 0;
        wav.muted = false;
        isWavBlessed = true;
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Toca 1 ciclo do alarme (3 bipes rápidos em ~0.72s).
 * Chamado a cada 1.1s enquanto isAlarmRinging === true:
 * - Ativa audioSession = 'transient' para fazer FADE (ducking) na música do Deezer/Spotify sem pausá-la.
 * - Toca SEMPRE o sharedWavAudio.play() em TODOS os ciclos (além do WebAudio), garantindo que
 *   ao voltar do WhatsApp para o app o alarme continue tocando todos os 15 ciclos até apertar PARAR ALARME!
 */
export async function playAlarmBurst({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastBurstTimestamp < 320) {
    return;
  }
  lastBurstTimestamp = now;

  // Solicita 'transient' durante os bipes para o iOS fazer ducking (fade no volume do Deezer sem pausar a música)
  setAudioSessionType('transient');

  // 1. Dispara SEMPRE via HTMLAudioElement WAV (confiável em todos os 15 ciclos no iOS mesmo após retorno do WhatsApp sem novo toque)
  try {
    const wav = ensureAlarmAudioElement();
    if (wav) {
      wav.muted = false;
      wav.volume = 1.0;
      wav.currentTime = 0;
      wav.play().catch(() => {});
    }
  } catch {
    // ignore
  }

  // 2. Complementa com Web Audio API quando o contexto estiver ativo
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        sharedAudioCtx = new AudioCtx();
      }
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

          gain.gain.setValueAtTime(0.65, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(ctx.currentTime + start);
          osc2.start(ctx.currentTime + start);
          osc1.stop(ctx.currentTime + start + dur);
          osc2.stop(ctx.currentTime + start + dur);

          activeOscillators.push(osc1, osc2);
        });
      }
    }
  } catch {
    // ignore
  }
}

export function stopSharedAudio() {
  lastBurstTimestamp = 0;

  // Para imediatamente quaisquer osciladores Web Audio ativos
  if (activeOscillators.length > 0) {
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    activeOscillators = [];
  }

  // Pausa e rebobina o WAV
  if (sharedWavAudio) {
    try {
      sharedWavAudio.pause();
      sharedWavAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }

  // Restaura sessão 'ambient' imediatamente -> o iOS remove o ducking e a música no Deezer/Spotify volta a 100% do volume sozinha!
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
