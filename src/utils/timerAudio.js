// Motor de áudio do Cronômetro de Descanso (Web Audio API + Fallback WAV em memória)
// Desbloqueio estrito em gesto direto do usuário (zero warnings de autoplay no console)

let sharedAudioCtx = null;
let sharedWavAudio = null;
let hasUserInteracted = false;

function createAlarmWavDataUri() {
  const sampleRate = 22050;
  const durationSec = 0.55;
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
    if (t < 0.18) {
      const env = Math.min(1, t / 0.01) * Math.min(1, (0.18 - t) / 0.03);
      sample = Math.sin(2 * Math.PI * 880 * t) * 0.65 * env;
    } else if (t >= 0.24 && t < 0.48) {
      const t2 = t - 0.24;
      const env = Math.min(1, t2 / 0.01) * Math.min(1, (0.24 - t2) / 0.04);
      sample = Math.sin(2 * Math.PI * 1174.66 * t) * 0.75 * env;
    }
    const pcm = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, pcm < 0 ? pcm * 0x8000 : pcm * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

/**
 * Deve ser chamado EXCLUSIVAMENTE dentro de um handler de clique/toque real do usuário
 */
export function unlockTimerAudio() {
  hasUserInteracted = true;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
      }
    }
    if (!sharedWavAudio) {
      sharedWavAudio = new Audio(createAlarmWavDataUri());
      sharedWavAudio.volume = 0.9;
      sharedWavAudio.preload = 'auto';
      sharedWavAudio.load();
    }
  } catch {
    // ignore
  }
}

export async function playAlarmBurst() {
  let playedViaWebAudio = false;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx && sharedAudioCtx) {
      if (sharedAudioCtx.state === 'suspended') {
        await sharedAudioCtx.resume().catch(() => {});
      }
      if (sharedAudioCtx.state === 'running') {
        const ctx = sharedAudioCtx;
        const notes = [
          { freq: 880, start: 0, dur: 0.16 },
          { freq: 1174.66, start: 0.22, dur: 0.22 }
        ];
        notes.forEach(({ freq, start, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        });
        playedViaWebAudio = true;
      }
    }
  } catch {
    playedViaWebAudio = false;
  }

  // Fallback real para HTMLAudioElement WAV sempre que WebAudio não estiver 'running'
  if (!playedViaWebAudio) {
    try {
      if (!sharedWavAudio) {
        sharedWavAudio = new Audio(createAlarmWavDataUri());
        sharedWavAudio.volume = 0.9;
      }
      sharedWavAudio.currentTime = 0;
      await sharedWavAudio.play().catch(() => {});
    } catch {
      // ignore
    }
  }
}

export function stopSharedAudio() {
  if (sharedWavAudio) {
    try {
      sharedWavAudio.pause();
      sharedWavAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }
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
