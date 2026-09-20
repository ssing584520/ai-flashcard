import type { FlashCard } from '../types';

export function pickAudio(card: FlashCard, accent: 'uk' | 'us'): string | undefined {
  const audio = (card.metadata?.phonetics || [])
    .map(p => p.audio)
    .filter((a): a is string => !!a);
  return audio.find(u => u.includes(`-${accent}.mp3`)) || audio.find(u => u.includes(`-${accent}.`)) || audio[0];
}

let synth: SpeechSynthesis | null = null;

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

export function speak(word: string, accent: 'uk' | 'us', audioUrl?: string): void {
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const s = getSynth();
  if (!s) return;

  // 每次都在用户手势内 resume，防止后台挂起
  s.resume();

  // 核心修复：每次点击都 cancel() 清掉队列里残留的未播放 utterance，
  // 再 speak()。Chromium 平板上上一次 speak() 的 utterance 会滞留在队列，
  // 下次直接 speak() 会被排队在残句之后、且残句可能因 voice 缺失而无声，
  // 导致"第一次有声音、第二次没声音"。cancel() 清干净后 speak() 立即播。
  s.cancel();
  s.speak(makeUtterance(word, lang));

  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => { /* TTS 已覆盖 */ });
  }
}

function makeUtterance(word: string, lang: string): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(word);
  u.lang = lang;
  u.rate = 0.85;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  return u;
}
