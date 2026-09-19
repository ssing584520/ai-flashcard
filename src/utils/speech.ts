import type { FlashCard } from '../types';

export function pickAudio(card: FlashCard, accent: 'uk' | 'us'): string | undefined {
  const audio = (card.metadata?.phonetics || [])
    .map(p => p.audio)
    .filter((a): a is string => !!a);
  return audio.find(u => u.includes(`-${accent}.mp3`)) || audio.find(u => u.includes(`-${accent}.`)) || audio[0];
}

export function speak(word: string, accent: 'uk' | 'us', audioUrl?: string): void {
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  let spoken = false;

  const speakTTS = () => {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = lang;
    u.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === lang) || voices[0];
    if (preferred) u.voice = preferred;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const scheduleTTS = () => {
    setTimeout(() => {
      if (spoken) return;
      speakTTS();
    }, 800);
  };

  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play()
      .then(() => { spoken = true; })
      .catch(() => { spoken = true; scheduleTTS(); });
    audio.addEventListener('ended', () => { spoken = true; });
    scheduleTTS();
  } else {
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
        window.speechSynthesis.onvoiceschanged = () => {
          trySpeak();
          window.speechSynthesis.onvoiceschanged = null;
        };
      }
    };
    trySpeak();
  }
}