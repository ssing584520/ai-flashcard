import type { FlashCard } from '../types';

export function pickAudio(card: FlashCard, accent: 'uk' | 'us'): string | undefined {
  const audio = (card.metadata?.phonetics || [])
    .map(p => p.audio)
    .filter((a): a is string => !!a);
  return audio.find(u => u.includes(`-${accent}.mp3`)) || audio.find(u => u.includes(`-${accent}.`)) || audio[0];
}

function ttsFallback(word: string, accent: 'uk' | 'us'): void {
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const u = new SpeechSynthesisUtterance(word);
  u.lang = lang;
  u.rate = 0.85;
  u.pitch = 1;
  window.speechSynthesis.cancel();
  if (window.speechSynthesis.getVoices) {
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === lang && (v.name.includes('Mobile') || v.name.includes('Premium') || v.name.includes('Natural')))
      || voices.find(v => v.lang === lang)
      || voices[0];
    if (preferred) u.voice = preferred;
  }
  window.speechSynthesis.speak(u);
}

export function speak(word: string, accent: 'uk' | 'us', audioUrl?: string): void {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => ttsFallback(word, accent));
    return;
  }
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = lang;
      u.rate = 0.85;
      const preferred = voices.find(v => v.lang === lang) || voices[0];
      if (preferred) u.voice = preferred;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } else {
      ttsFallback(word, accent);
    }
  };
  if (window.speechSynthesis.getVoices().length > 0) {
    trySpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      trySpeak();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }
}