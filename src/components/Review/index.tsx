import { useState } from 'react';
import { useCards } from '../../hooks/useCards';
import { useReview } from '../../hooks/useReview';
import { useSettings } from '../../hooks/useSettings';
import { cnPartOfSpeech } from '../../services/dictionary';
import type { FlashCard, ReviewRating, CardType } from '../../types';

function pickAudio(card: FlashCard, accent: 'uk' | 'us'): string | undefined {
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

function speak(word: string, accent: 'uk' | 'us', audioUrl?: string): void {
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

export default function Review({ onHome }: { onHome?: () => void }) {
  const { settings } = useSettings();
  const { cards, getDueCards, reload } = useCards();
  const { currentIndex, isFlipped, sessionCards, startSession, flip, rate, progress, sessionDone } = useReview();
  const [started, setStarted] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedType, setSelectedType] = useState<CardType | 'all'>('all');
  const card = sessionCards[currentIndex] as FlashCard | undefined;
  const backLines = card ? (card.back || '').split('\n').map(l => l.trim()).filter(Boolean) : [];

  const handleStart = () => {
    setNotice('');
    getDueCards(selectedType === 'all' ? undefined : selectedType).then(due => {
      if (due.length > 0) {
        startSession(due);
        setStarted(true);
      } else {
        setNotice('该分类今天没有到期卡片，休息一下吧 ✨');
      }
    }).catch(() => setNotice('加载复习卡片失败，请重试'));
  };

  const handleRestart = async () => {
    setStarted(false);
    await reload();
    handleStart();
  };

  if (!started && !sessionDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-8xl mb-6 animate-float">🦊</div>
        <h2 className="text-2xl font-black text-candy-text mb-2">准备好复习了吗？</h2>
        <p className="text-candy-text-light mb-4 text-center">
          今天有 <span className="font-bold text-candy-pink">{sessionCards.length || cards.length}</span> 张卡片需要复习
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {([
            { id: 'all', label: '🃏 全部' },
            { id: 'english', label: '🔤 英语' },
            { id: 'chinese', label: '🀄 中文' },
            { id: 'mistake', label: '❌ 错题' },
            { id: 'custom', label: '✏️ 自定义' }
          ] as { id: CardType | 'all'; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95
                ${selectedType === t.id
                  ? 'bg-candy-pink text-white shadow-soft'
                  : 'bg-candy-card text-candy-text shadow-card hover:shadow-soft'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleStart}
          className="bg-gradient-to-r from-candy-pink to-candy-peach text-white font-bold py-4 px-12 rounded-full text-lg shadow-soft active:scale-95 transition-transform"
        >
          开始复习 ✨
        </button>
        {notice && (
          <p className="text-candy-text-light text-sm mt-4 text-center">{notice}</p>
        )}
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-8xl mb-4 animate-confetti">🎉</div>
        <h2 className="text-2xl font-black text-candy-text mb-2">太棒了！复习完成！</h2>
        <p className="text-candy-text-light mb-8">继续保持，你真的很努力！</p>
        <div className="flex gap-4">
          <button
            onClick={handleRestart}
            className="bg-candy-blue text-candy-text font-bold py-3 px-8 rounded-full shadow-card active:scale-95 transition-transform"
          >
            再来一轮 🔄
          </button>
          <button
            onClick={() => (onHome ? onHome() : setStarted(false))}
            className="bg-candy-mint text-candy-text font-bold py-3 px-8 rounded-full shadow-card active:scale-95 transition-transform"
          >
            返回首页 🏠
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-6">
        <div className="flex justify-between text-xs text-candy-text-light mb-2">
          <span>{currentIndex + 1} / {sessionCards.length}</span>
          <span>🦊 加油！</span>
        </div>
        <div className="h-3 bg-candy-cream rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-candy-pink to-candy-yellow rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="card-perspective w-full h-[36rem] mb-6 cursor-pointer" onClick={flip}>
        <div className={`card-inner ${isFlipped ? 'flipped' : ''} w-full h-full`}>
          <div className="card-front bg-gradient-to-br from-candy-pink to-candy-peach flex flex-col items-center justify-center p-6 shadow-soft">
            <span className="text-sm text-white/70 mb-2">
              {card.type === 'english' ? '🔤 英语单词' : card.type === 'chinese' ? '🀄 中文词语' : card.type === 'mistake' ? '❌ 错题' : '✏️ 自定义'}
            </span>
            {card.type === 'mistake' && card.metadata?.imageUrl && (
              <img src={card.metadata.imageUrl} alt="错题" className="max-h-48 object-contain mb-3 rounded-lg" />
            )}
            {card.type !== 'english' && card.type !== 'mistake' && (
              <p className="text-3xl font-black text-white text-center break-words leading-tight">{card.front}</p>
            )}
            {card.type === 'english' && (
              <button
                onClick={e => { e.stopPropagation(); speak(card.front, settings.accent, pickAudio(card, settings.accent)); }}
                className="mt-3 bg-white/20 hover:bg-white/30 text-white font-bold px-5 py-2 rounded-full active:scale-95 transition-all"
              >
                🔊 发音
              </button>
            )}
            {card.metadata?.phonetic && (
              <p className="text-white/80 text-lg mt-2 font-mono">{card.metadata.phonetic}</p>
            )}
            <p className="text-white/60 text-sm mt-6">点击翻面 👆</p>
          </div>

          <div className="card-back bg-candy-card flex flex-col p-6 shadow-soft overflow-y-auto">
            {card.type === 'english' && (
              <div className="mb-4 pb-3 border-b border-candy-lavender">
                <p className="text-2xl font-black text-candy-text text-center">{card.front}</p>
                {card.metadata?.phonetic && (
                  <p className="text-candy-text-light text-lg mt-1 font-mono text-center">{card.metadata.phonetic}</p>
                )}
              </div>
            )}
            {(card.metadata?.meanings && card.metadata.meanings.length > 0) ? (
              (card.metadata.meanings as any[]).map((m: any, i: number) => {
                const isPhrase = (card.front || '').trim().split(/\s+/).length > 1;
                const isDerived = !isPhrase && m.word && m.word.toLowerCase() !== card.front.toLowerCase();
                return (
                  <div key={i} className={isDerived ? 'mb-3 border-t-2 border-dashed border-candy-lavender pt-3' : 'mb-3'}>
                    {!isPhrase && (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {isDerived && (
                          <>
                            <span className="text-xl font-black text-amber-700">{m.word}</span>
                            <button
                              onClick={e => { e.stopPropagation(); speak(m.word, settings.accent); }}
                              className="text-sm font-bold text-candy-pink bg-candy-pink/10 hover:bg-candy-pink/20 px-2 py-0.5 rounded-full active:scale-95 transition-transform"
                            >
                              🔊
                            </button>
                          </>
                        )}
                        <span className="text-sm font-semibold text-candy-pink uppercase">{cnPartOfSpeech(m.partOfSpeech)}</span>
                      </div>
                    )}
                    <p className={isPhrase ? 'text-base text-candy-text text-center' : 'text-base text-candy-text'}>{m.definition}</p>
                    {m.example && (
                      <p className={isPhrase ? 'text-base font-bold text-candy-text mt-1 text-center' : 'text-base font-bold text-candy-text mt-1'}>"{m.example}"</p>
                    )}
                    {isPhrase && <div className="border-b-2 border-dashed border-candy-lavender/60 mt-3" />}
                  </div>
                );
              })
            ) : card.type === 'chinese' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-2">
                <p className="text-2xl font-black text-candy-text text-center break-words">{backLines[0] || card.front}</p>
                {backLines.length > 1 && (
                  <div className="w-full space-y-3">
                    {backLines.slice(1).map((line, i) => (
                      <p key={i} className="text-lg text-candy-text leading-relaxed text-center">{line}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-2">
                {card.type === 'mistake' && card.metadata?.answerImageUrl && (
                  <img src={card.metadata.answerImageUrl} alt="答案" className="max-h-56 object-contain rounded-xl border-2 border-candy-pink/20" />
                )}
                {card.back && card.back !== '暂无内容' ? (
                  <p className={`${card.type === 'custom' ? 'text-3xl' : 'text-lg'} font-bold text-candy-text whitespace-pre-line text-center`}>{card.back}</p>
                ) : card.type !== 'mistake' && (
                  <p className={`${card.type === 'custom' ? 'text-3xl' : 'text-lg'} font-bold text-candy-text whitespace-pre-line text-center`}>{card.front}</p>
                )}
              </div>
            )}
            {card.metadata?.examples && (card.metadata.examples as string[]).map((ex: string, i: number) => (
              <p key={i} className="text-base font-bold text-candy-text mt-1">💬 {ex}</p>
            ))}
            {card.metadata?.mnemonic && (
              <div className="mt-3 bg-candy-yellow/30 rounded-xl p-3">
                <p className="text-sm font-semibold text-candy-text">💡 记忆技巧</p>
                <p className="text-base text-candy-text mt-1">{card.metadata.mnemonic}</p>
              </div>
            )}
            {card.metadata?.analysis && (
              <div className="mt-3 bg-candy-mint/30 rounded-xl p-3">
                <p className="text-sm font-semibold text-candy-text">📝 解析</p>
                <p className="text-base text-candy-text mt-1">{card.metadata.analysis}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="grid grid-cols-3 gap-3">
          <RatingButton rating="forget" label="忘记了" emoji="😵" onClick={() => rate('forget', settings.schedules)} />
          <RatingButton rating="hard" label="记错了" emoji="❌" onClick={() => rate('hard', settings.schedules)} />
          <RatingButton rating="good" label="记对了" emoji="✅" onClick={() => rate('good', settings.schedules)} />
        </div>
      )}

      {!isFlipped && (
        <p className="text-center text-xs text-candy-text-light mt-2">点击卡片查看答案 👆</p>
      )}
    </div>
  );
}

function RatingButton({ rating, label, emoji, onClick }: { rating: ReviewRating; label: string; emoji: string; onClick: () => void }) {
  const colors: Record<ReviewRating, string> = {
    forget: 'bg-candy-peach hover:bg-red-300',
    hard: 'bg-candy-yellow hover:bg-yellow-300',
    good: 'bg-candy-blue hover:bg-blue-300',
    easy: 'bg-candy-mint hover:bg-green-300'
  };
  return (
    <button
      onClick={onClick}
      className={`${colors[rating]} text-candy-text font-bold py-3 rounded-xl shadow-card active:scale-95 transition-all`}
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xs">{label}</div>
    </button>
  );
}
