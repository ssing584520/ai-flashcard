import type { FlashCard } from '../types';

export function pickAudio(card: FlashCard, accent: 'uk' | 'us'): string | undefined {
  const audio = (card.metadata?.phonetics || [])
    .map(p => p.audio)
    .filter((a): a is string => !!a);
  return audio.find(u => u.includes(`-${accent}.mp3`)) || audio.find(u => u.includes(`-${accent}.`)) || audio[0];
}

// 模块级单例
let synth: SpeechSynthesis | null = null;
let voiceWatchFired = false;
let voiceWatchTimer: ReturnType<typeof setTimeout> | null = null;

function getSynth(): SpeechSynthesis | null {
  if (synth === null) {
    synth = typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : null;
  }
  return synth;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const s = getSynth();
  if (!s) return undefined;
  const voices = s.getVoices();
  return voices.find(v => v.lang === lang)
    || voices.find(v => v.lang?.startsWith(lang.slice(0, 2)))
    || undefined;
}

// 监听 voice 加载，voice 就绪后补播一次精确发音（Chromium 上首次 speak 常无 voice）
function armVoiceWatch(replay: () => void) {
  const s = getSynth();
  if (!s) return;
  if (s.getVoices().length > 0 || voiceWatchFired) return;

  let settled = false;
  const fire = () => {
    if (settled) return;
    settled = true;
    voiceWatchFired = true;
    clearTimeout(voiceWatchTimer!);
    s.removeEventListener('voiceschanged', fire);
    replay();
  };
  s.addEventListener('voiceschanged', fire);
  // voice 始终不加载（某些 Android WebView）则 6s 后强制补播
  voiceWatchTimer = setTimeout(fire, 6000);
}

export function speak(word: string, accent: 'uk' | 'us', audioUrl?: string): void {
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const s = getSynth();
  if (!s) return;

  // 每次都在用户手势内 resume，避免 Chromium 后台挂起 TTS
  s.resume();

  const speakTTS = () => {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = lang;
    u.rate = 0.85;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    // 不调 cancel()：speak() 自动替换队列中未开始的 utterance，
    // cancel() 在 Chromium 平板上会静默丢弃后续 speak。
    s.speak(u);
  };

  // voice 未就绪时先 speak（默认 voice 也出声），voice 加载后补播精确版
  speakTTS();
  armVoiceWatch(speakTTS);

  if (audioUrl) {
    // 同时尝试真实发音（更自然）；失败/异常时 TTS 兜底已覆盖
    const audio = new Audio(audioUrl);
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* TTS 已兜底 */ });
  }
}
