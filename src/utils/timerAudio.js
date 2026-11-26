// Motor de áudio Seamless Music-First para iOS 17/18 WebKit (iPhone 15) + Android/Desktop
// Arquitetura de MOTOR ÚNICO EXCLUSIVO (zero sobreposição de tons):
// 1. Durante a contagem regressiva: NENHUM áudio é reproduzido e navigator.audioSession.type = 'ambient'
//    -> A música no Deezer/Spotify/YouTube Music NUNCA pausa nem baixa de volume.
// 2. Quando o alarme dispara (em 1º plano no Modo Foco ou no instante em que volta do WhatsApp):
//    -> navigator.audioSession.type muda para 'transient', fazendo FADE (ducking) automático na música sem pausá-la.
//    -> Toca EXCLUSIVAMENTE 1 única fonte por ciclo: HTMLAudioElement WAV pré-gerado em memória (3 bipes em 0.72s).
//       Web Audio API atua APENAS como fallback exclusivo se o <audio> WAV falhar/rejeitar.
//    -> Lock real (isBurstPlaying + burstGeneration + cooldown >= 950ms) impede qualquer sobreposição ou tom duplo.
// 3. Ao tocar em PARAR ALARME (stopSharedAudio):
//    -> Interrompe imediatamente qualquer ciclo ativo/pendente e restaura navigator.audioSession.type = 'ambient',
//       devolvendo o volume do Deezer/Spotify a 100% automaticamente.

const BURST_DURATION_MS = 740;
const MIN_BURST_COOLDOWN_MS = 950;

export const TIMER_VOLUME_LEVELS = {
  low: { id: 'low', label: 'Baixo', gain: 0.25 },
  medium: { id: 'medium', label: 'Médio', gain: 0.58 },
  high: { id: 'high', label: 'Alto', gain: 1.0 }
};

let sharedAudioCtx = null;
let sharedWavAudio = null;
let activeOscillators = [];
let hasUserInteracted = false;
let isWavBlessed = false;
let currentVolumeLevel = 'high';
const alarmWavUriCache = {};

let isBurstPlaying = false;
let burstGeneration = 0;
let burstReleaseTimer = null;
let previewAmbientTimer = null;
let lastBurstTimestamp = 0;

function normalizeVolumeLevel(level) {
  return TIMER_VOLUME_LEVELS[level] ? level : 'high';
}

export function getTimerVolumeLevel() {
  return currentVolumeLevel;
}

export function setTimerVolumeLevel(level) {
  const valid = normalizeVolumeLevel(level);
  currentVolumeLevel = valid;
  if (sharedWavAudio && !isBurstPlaying) {
    try {
      sharedWavAudio.src = getAlarmWavDataUri(valid);
      sharedWavAudio.volume = 1.0;
    } catch {
      // ignore
    }
  }
  return valid;
}

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
 * Gera em memória um WAV de alarme de alto contraste acústico (3 bipes harmônicos em 0.72s:
 * 880/1760 Hz -> 1174.66/2349.32 Hz -> 1318.51/2637.02 Hz) escalonado diretamente em PCM 16-bit
 * para funcionar de forma idêntica no iOS WebKit (onde HTMLMediaElement.volume é somente leitura).
 */
export function getAlarmWavDataUri(level = currentVolumeLevel) {
  const validLevel = normalizeVolumeLevel(level);
  if (alarmWavUriCache[validLevel]) return alarmWavUriCache[validLevel];

  const gain = TIMER_VOLUME_LEVELS[validLevel].gain;
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
      sample = (f1 + f2) * 0.64 * env * gain;
    } else if (t >= 0.21 && t < 0.39) {
      const t2 = t - 0.21;
      const env = Math.min(1, t2 / 0.008) * Math.min(1, (0.18 - t2) / 0.025);
      const f1 = Math.sin(2 * Math.PI * 1174.66 * t);
      const f2 = Math.sin(2 * Math.PI * 2349.32 * t) * 0.45;
      sample = (f1 + f2) * 0.66 * env * gain;
    } else if (t >= 0.44 && t < 0.68) {
      const t3 = t - 0.44;
      const env = Math.min(1, t3 / 0.008) * Math.min(1, (0.24 - t3) / 0.035);
      const f1 = Math.sin(2 * Math.PI * 1318.51 * t);
      const f2 = Math.sin(2 * Math.PI * 2637.02 * t) * 0.45;
      sample = (f1 + f2) * 0.68 * env * gain;
    }
    const pcm = Math.max(-0.95, Math.min(0.95, sample));
    view.setInt16(44 + i * 2, pcm < 0 ? pcm * 0x8000 : pcm * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const uri = 'data:audio/wav;base64,' + btoa(binary);
  alarmWavUriCache[validLevel] = uri;
  return uri;
}

function ensureAlarmAudioElement(level = currentVolumeLevel) {
  if (typeof Audio === 'undefined') return null;
  const targetUri = getAlarmWavDataUri(level);
  if (!sharedWavAudio) {
    sharedWavAudio = new Audio(targetUri);
    sharedWavAudio.volume = 1.0;
    sharedWavAudio.preload = 'auto';
    sharedWavAudio.playsInline = true;
    sharedWavAudio.setAttribute?.('playsinline', 'true');
  } else if (sharedWavAudio.src !== targetUri && !isBurstPlaying) {
    sharedWavAudio.src = targetUri;
    sharedWavAudio.volume = 1.0;
  }
  return sharedWavAudio;
}

function stopActiveOscillators() {
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
}

function stopCurrentBurst() {
  if (burstReleaseTimer) {
    clearTimeout(burstReleaseTimer);
    burstReleaseTimer = null;
  }
  if (previewAmbientTimer) {
    clearTimeout(previewAmbientTimer);
    previewAmbientTimer = null;
  }
  isBurstPlaying = false;
  stopActiveOscillators();

  if (sharedWavAudio) {
    try {
      sharedWavAudio.pause();
      sharedWavAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }
}

function armBurstRelease(gen) {
  if (burstReleaseTimer) {
    clearTimeout(burstReleaseTimer);
  }
  burstReleaseTimer = setTimeout(() => {
    if (gen === burstGeneration) {
      isBurstPlaying = false;
      burstReleaseTimer = null;
    }
  }, BURST_DURATION_MS);
}

async function playWebAudioFallback(gen) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      if (gen === burstGeneration) isBurstPlaying = false;
      return false;
    }
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state !== 'running') {
      await sharedAudioCtx.resume().catch(() => {});
    }
    // Aborta se stopSharedAudio() ou um novo ciclo foi iniciado durante o await
    if (gen !== burstGeneration) return false;
    if (sharedAudioCtx.state !== 'running') {
      isBurstPlaying = false;
      return false;
    }

    stopActiveOscillators();
    const ctx = sharedAudioCtx;
    const gainScale = TIMER_VOLUME_LEVELS[normalizeVolumeLevel(currentVolumeLevel)].gain;
    const peakGain = Math.max(0.05, 0.65 * gainScale);
    const notes = [
      { freq: 880, harmonic: 1760, start: 0, dur: 0.16 },
      { freq: 1174.66, harmonic: 2349.32, start: 0.21, dur: 0.18 },
      { freq: 1318.51, harmonic: 2637.02, start: 0.44, dur: 0.24 }
    ];
    notes.forEach(({ freq, harmonic, start, dur }) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc2.frequency.setValueAtTime(harmonic, ctx.currentTime + start);

      gain.gain.setValueAtTime(peakGain, ctx.currentTime + start);
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

    armBurstRelease(gen);
    return true;
  } catch {
    if (gen === burstGeneration) isBurstPlaying = false;
    return false;
  }
}

/**
 * Tenta tirar o AudioContext de 'suspended' OU 'interrupted' ao voltar do background no iOS.
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
            if (!isBurstPlaying) {
              wav.pause();
              wav.currentTime = 0;
            }
            wav.muted = false;
            isWavBlessed = true;
          })
          .catch(() => {
            wav.muted = false;
          });
      } else {
        if (!isBurstPlaying) {
          wav.pause();
          wav.currentTime = 0;
        }
        wav.muted = false;
        isWavBlessed = true;
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Toca EXATAMENTE 1 ciclo limpo do alarme (3 bipes em 0.72s) usando 1 único motor exclusivo:
 * - Motor primário: HTMLAudioElement WAV (confiável no iOS 17/18 mesmo após retornar do WhatsApp).
 * - Fallback exclusivo: Web Audio API APENAS se o <audio> WAV falhar/não existir.
 * - Lock real (isBurstPlaying + burstGeneration + cooldown >= 950ms) impede qualquer sobreposição.
 */
export async function playAlarmBurst({ force = false, level } = {}) {
  const now = Date.now();
  if (!force && (isBurstPlaying || now - lastBurstTimestamp < MIN_BURST_COOLDOWN_MS)) {
    return false;
  }

  const targetLevel = level ? normalizeVolumeLevel(level) : currentVolumeLevel;
  currentVolumeLevel = targetLevel;

  stopCurrentBurst();
  burstGeneration += 1;
  const gen = burstGeneration;
  isBurstPlaying = true;
  lastBurstTimestamp = now;

  // Solicita 'transient' durante os bipes para o iOS fazer ducking (fade na música sem pausá-la)
  setAudioSessionType('transient');

  const wav = ensureAlarmAudioElement(targetLevel);
  if (wav) {
    try {
      const targetUri = getAlarmWavDataUri(targetLevel);
      if (wav.src !== targetUri) {
        wav.src = targetUri;
      }
      wav.muted = false;
      wav.volume = 1.0;
      wav.currentTime = 0;
      wav.onended = () => {
        if (gen === burstGeneration) {
          isBurstPlaying = false;
          if (burstReleaseTimer) {
            clearTimeout(burstReleaseTimer);
            burstReleaseTimer = null;
          }
        }
      };

      const playPromise = wav.play();
      armBurstRelease(gen);

      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
        return gen === burstGeneration;
      }
      return true;
    } catch {
      if (gen !== burstGeneration) return false;
      // Fallback exclusivo para Web Audio somente quando o WAV foi bloqueado/falhou
      return await playWebAudioFallback(gen);
    }
  }

  return await playWebAudioFallback(gen);
}

/**
 * Reproduz 1 único toque curto de prévia no volume escolhido e restaura 'ambient' após 740ms,
 * devolvendo o volume da música no Deezer/Spotify automaticamente.
 */
export async function previewAlarmBurst(level = currentVolumeLevel) {
  unlockTimerAudio();
  const valid = setTimerVolumeLevel(level);
  const ok = await playAlarmBurst({ force: true, level: valid });
  const previewGen = burstGeneration;
  previewAmbientTimer = setTimeout(() => {
    if (previewGen === burstGeneration) {
      setAudioSessionType('ambient');
      previewAmbientTimer = null;
    }
  }, BURST_DURATION_MS + 40);
  return ok;
}

export function stopSharedAudio() {
  burstGeneration += 1;
  lastBurstTimestamp = 0;
  stopCurrentBurst();

  // Restaura sessão 'ambient' imediatamente -> música no Deezer/Spotify volta a 100% sozinha
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
