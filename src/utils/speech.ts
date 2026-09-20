import type { FlashCard } from '../types';

export function pickAudio(card: FlashCard, accent: 'uk' | 'us'): string | undefined {
  const audio = (card.metadata?.phonetics || [])
    .map(p => p.audio)
    .filter((a): a is string => !!a);
  return audio.find(u => u.includes(`-${accent}.mp3`)) || audio.find(u => u.includes(`-${accent}.`)) || audio[0];
}

// 模块级单例：首次用户手势里 resume，后续直接 speak
// Chromium 上 cancel() 后立刻 speak() 会被静默丢弃；resume 必须发生在用户手势内
let synth: SpeechSynthesis | null = null;
let warmupDone = false;

function getSynth(): SpeechSynthesis | null {
  if (synth === null) {
    synth = typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : null;
  }
  return synth;
}

function primeAudio() {
  const s = getSynth();
  if (!s) return;
  if (!warmupDone) {
    // 在用户手势内 resume + 空 utterance，激活音频引擎
    s.resume();
    const prime = new SpeechSynthesisUtterance(' ');
    s.speak(prime);
    warmupDone = true;
  }
  s.resume();
}

function pickVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find(v => v.lang === lang)
    || voices.find(v => v.lang?.startsWith(lang.slice(0, 2)))
    || voices[0];
}

export function speak(word: string, accent: 'uk' | 'us', audioUrl?: string): void {
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const s = getSynth();
  if (!s) return;

  primeAudio();

  // 若已有 audioUrl，先放 TTS 兜底；800ms 后若 audio 未结束则再播一次 TTS
  let ttsFired = false;

  const speakTTS = () => {
    if (ttsFired) return;
    ttsFired = true;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = lang;
    u.rate = 0.85;
    const voices = s.getVoices();
    const preferred = pickVoice(lang, voices);
    if (preferred) u.voice = preferred;
    s.cancel();
    s.resume();
    s.speak(u);
  };

  if (audioUrl) {
    const audio = new Audio(audioUrl);
    let ended = false;
    audio.addEventListener('ended', () => { ended = true; });
    audio.addEventListener('error', () => { ended = true; speakTTS(); });
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => { ended = true; speakTTS(); });
    // 800ms 后若 audio 仍在播（即正常播了），则不补 TTS；若已 ended（出错/秒过）则 TTS 已触发
    setTimeout(() => {
      if (!ended) speakTTS();
    }, 800);
  } else {
    // 无音频：确保 voice 加载后再 speak
    if (s.getVoices().length > 0) {
      speakTTS();
    } else {
      const onVoices = () => {
        s.removeEventListener('voiceschanged', onVoices);
        speakTTS();
      };
      s.addEventListener('voiceschanged', onVoices);
      // 6s 内 voice 未就绪则直接 speak（默认 voice）
      setTimeout(() => {
        s.removeEventListener('voiceschanged', onVoices);
        speakTTS();
      }, 6000);
    }
  }
}
