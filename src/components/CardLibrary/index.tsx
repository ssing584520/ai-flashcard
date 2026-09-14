import { useMemo, useState } from 'react';
import { useCards } from '../../hooks/useCards';
import { useSettings } from '../../hooks/useSettings';
import { cnPartOfSpeech } from '../../services/dictionary';
import { speak, pickAudio } from '../../utils/speech';
import type { FlashCard, ReviewLog } from '../../types';

function getChineseWord(card: FlashCard): string {
  return (card.front || '').trim() || (card.back && card.back !== '暂无内容' ? card.back : '');
}

function getCardLabel(card: FlashCard): string {
  if (card.type === 'mistake') return card.metadata?.imageUrl ? '错题图片' : (card.back && card.back !== '暂无内容' ? card.back : '错题');
  return card.type === 'chinese' ? getChineseWord(card) : card.front;
}

function typeIcon(type: string): string {
  return type === 'english' ? '🔤' : type === 'chinese' ? '🀄' : type === 'mistake' ? '❌' : '✏️';
}

export default function CardLibrary() {
  const { cards, reviews, deleteCard } = useCards();
  const { settings } = useSettings();
  const schedules = settings.schedules;
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const checkedMap = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const card of cards) map.set(card.id, new Set<number>());

    const byCard = new Map<string, ReviewLog[]>();
    for (const r of reviews) {
      const arr = byCard.get(r.cardId) || [];
      arr.push(r);
      byCard.set(r.cardId, arr);
    }

    for (const [cardId, list] of byCard) {
      const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
      let count = 0;
      const checked = new Set<number>();
      for (const r of sorted) {
        if (r.rating === 'forget' || r.rating === 'hard') {
          count = 0;
          checked.clear();
          continue;
        }
        if (r.rating === 'good' || r.rating === 'easy') {
          if (count < schedules.length) checked.add(schedules[count]);
          count = Math.min(count + 1, schedules.length);
        }
      }
      map.set(cardId, checked);
    }
    return map;
  }, [cards, reviews, schedules]);

  const categories = [...new Set(cards.map((c: FlashCard) => c.category))];

  const filtered = cards
    .filter((c: FlashCard) => {
      const searchable = c.type === 'mistake' ? (c.back || '') : c.front;
      const matchSearch = !search || searchable.includes(search) || c.tags.some((t: string) => t.includes(search));
      const matchType = filterType === 'all' || c.type === filterType;
      const matchCat = filterCategory === 'all' || c.category === filterCategory;
      return matchSearch && matchType && matchCat;
    })
    .sort((a, b) => {
      const keyA = getCardLabel(a);
      const keyB = getCardLabel(b);
      return keyA.localeCompare(keyB, 'zh', { sensitivity: 'base' });
    });

  const previewCard = previewId ? cards.find((c: FlashCard) => c.id === previewId) : null;

  const handleDelete = async (id: string) => {
    await deleteCard(id);
    setDeleteConfirm(null);
    if (previewId === id) setPreviewId(null);
  };

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-black text-candy-text mb-4">卡片库</h2>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-candy-text-light">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索卡片..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-candy-pink/20 focus:border-candy-pink focus:outline-none bg-candy-card"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: '全部' },
              { id: 'english', label: '英语' },
              { id: 'chinese', label: '中文' },
              { id: 'mistake', label: '错题' },
              { id: 'custom', label: '自定义' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all
                  ${filterType === t.id ? 'bg-candy-pink text-white' : 'bg-candy-card text-candy-text-light shadow-card'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {['all', ...categories].map(c => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                  ${filterCategory === c ? 'bg-candy-blue text-candy-text' : 'bg-candy-card text-candy-text-light'}`}
              >
                {c === 'all' ? '全部分类' : c}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl">
            <div className="min-w-max">
              <div
                className="grid gap-1 px-3 pb-2 items-center"
                style={{ gridTemplateColumns: `minmax(9rem, 1fr) repeat(${schedules.length}, 2.5rem) 2.75rem` }}
              >
                <p className="text-xs text-candy-text-light font-bold">词语</p>
                {schedules.map(s => (
                  <p key={s} className="text-center text-xs text-candy-text-light">{s}天</p>
                ))}
                <span />
              </div>

              <div className="space-y-2">
                {filtered.map((card: FlashCard) => {
                  const checked = checkedMap.get(card.id) || new Set<number>();
                  return (
                    <div
                      key={card.id}
                      onClick={() => setPreviewId(card.id)}
                      className={`relative bg-candy-card rounded-xl p-2.5 shadow-card cursor-pointer transition-all hover:ring-2 hover:ring-candy-pink/40
                        ${previewId === card.id ? 'ring-2 ring-candy-pink' : ''}`}
                    >
                      <div
                        className="grid gap-1 items-center"
                        style={{ gridTemplateColumns: `minmax(9rem, 1fr) repeat(${schedules.length}, 2.5rem) 2.75rem` }}
                      >
                        <div className="min-w-0 flex items-center gap-2 pr-2">
                          <span className="text-lg flex-shrink-0">{typeIcon(card.type)}</span>
                          <p className="font-semibold text-candy-text text-sm truncate">{getCardLabel(card)}</p>
                        </div>
                        {schedules.map(s => (
                          <div
                            key={s}
                            className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center ${checked.has(s) ? 'bg-candy-mint' : 'bg-candy-cream'}`}
                          >
                            {checked.has(s)
                              ? <span className="text-candy-text font-black">✓</span>
                              : <span className="text-candy-text-light/40">·</span>}
                          </div>
                        ))}
                        <div className="flex justify-end pr-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(card.id); }}
                            className="text-candy-text-light hover:text-red-500 transition-colors p-1.5"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {deleteConfirm === card.id && (
                        <div className="absolute inset-0 bg-candy-card/95 rounded-2xl flex flex-col items-center justify-center gap-3 z-10">
                          <p className="font-bold text-candy-text">确定删除？</p>
                          <div className="flex gap-3">
                            <button onClick={() => handleDelete(card.id)} className="bg-red-400 text-white px-4 py-2 rounded-full text-sm font-bold">删除</button>
                            <button onClick={() => setDeleteConfirm(null)} className="bg-candy-blue text-candy-text px-4 py-2 rounded-full text-sm font-bold">取消</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-candy-text-light">
                    <div className="text-5xl mb-3">🔍</div>
                    <p>没有找到卡片</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-candy-text-light">{filtered.length} 张卡片</p>
        </div>

        <div className="lg:sticky lg:top-6 space-y-4">
          {previewCard ? (
            <CardPreview card={previewCard} onClose={() => setPreviewId(null)} accent={settings.accent} />
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center gap-3 rounded-3xl bg-candy-card/60 border-2 border-dashed border-candy-pink/20 py-24 text-candy-text-light">
              <div className="text-5xl mb-3">👆</div>
              <p>点击左侧卡片查看内容</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const COLOR_HEX: Record<string, string> = {
  pink: '#FF9AA2', blue: '#B5DEFF', yellow: '#FFDAC1',
  mint: '#C7F9CC', lavender: '#E2D1F9', peach: '#FFB7B2'
};

function CardPreview({ card, onClose, accent }: { card: FlashCard; onClose: () => void; accent: 'uk' | 'us' }) {
  const [flipped, setFlipped] = useState(false);
  const m = card.metadata;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-candy-text">卡片预览</p>
        <button onClick={onClose} className="text-xs text-candy-text-light hover:text-candy-pink px-2 py-1">✕ 关闭</button>
      </div>

      <div
        onClick={() => setFlipped(f => !f)}
        className="bg-candy-card rounded-3xl shadow-card p-6 cursor-pointer select-none transition-transform active:scale-[0.99] min-h-[360px] flex flex-col"
        style={card.color ? { borderTop: `6px solid ${COLOR_HEX[card.color] ?? '#FF9AA2'}` } : {}}
      >
        {!flipped ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-5xl">{card.type === 'english' ? '🔤' : card.type === 'chinese' ? '🀄' : card.type === 'mistake' ? '❌' : '✏️'}</span>
            {card.type === 'mistake' && m.imageUrl ? (
              <>
                <img src={m.imageUrl} alt="错题" className="max-h-44 object-contain rounded-xl mt-2" />
                <p className="text-xs text-candy-text-light mt-1">错题图片 · {card.back && card.back !== '暂无内容' ? card.back : '点击查看答案'}</p>
              </>
            ) : card.type === 'chinese' ? (
              <>
                <p className="text-3xl font-black text-candy-text leading-tight font-mono">{m.phonetic || card.front}</p>
                {!m.phonetic && card.front && <p className="text-candy-pink text-lg">{card.front}</p>}
              </>
            ) : card.type === 'english' ? (
              <>
                <button
                  onClick={e => { e.stopPropagation(); speak(card.front, accent, pickAudio(card, accent)); }}
                  className="mt-2 bg-candy-pink/10 hover:bg-candy-pink/20 text-candy-pink font-bold px-5 py-2 rounded-full active:scale-95 transition-all"
                >
                  🔊 发音
                </button>
                {m.phonetic && <p className="text-candy-pink font-semibold font-mono">{m.phonetic}</p>}
              </>
            ) : card.type === 'custom' ? (
              <p className="text-3xl font-black text-candy-text leading-tight">{card.front}</p>
            ) : null}
            <div className="flex gap-1.5 mt-3 flex-wrap justify-center">
              {card.tags.map((tag: string, i: number) => (
                <span key={i} className="text-xs bg-candy-cream text-candy-text-light px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto">
            {card.type === 'mistake' && m.answerImageUrl && (
              <img src={m.answerImageUrl} alt="答案" className="max-h-44 object-contain rounded-xl mt-1" />
            )}
            {card.type === 'mistake' ? (
              card.back && card.back !== '暂无内容' ? (
                <p className="text-base text-candy-text">{card.back}</p>
              ) : (
                !m.answerImageUrl && !m.imageUrl && <p className="text-candy-text-light text-sm">点击添加答案内容</p>
              )
            ) : card.type === 'english' ? (
              <>
                <div className="mb-4 pb-3 border-b border-candy-lavender">
                  <p className="text-2xl font-black text-candy-text text-center">{card.front}</p>
                  {m.phonetic && <p className="text-candy-text-light text-lg mt-1 font-mono text-center">{m.phonetic}</p>}
                </div>
                {m.meanings && m.meanings.length > 0 ? (
                  m.meanings.map((mm, i) => {
                    const isPhrase = (card.front || '').trim().split(/\s+/).length > 1;
                    const isDerived = !isPhrase && mm.word && mm.word !== card.front && mm.word.toLowerCase() !== card.front.toLowerCase();
                    return (
                      <div key={i} className={isDerived ? 'mb-3 border-t-2 border-dashed border-candy-lavender pt-3' : 'mb-3'}>
                        {!isPhrase && (
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {isDerived && (
                              <>
                                <span className="text-xl font-black text-amber-700">{mm.word}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); speak(mm.word as string, accent); }}
                                  className="text-sm font-bold text-candy-pink bg-candy-pink/10 hover:bg-candy-pink/20 px-2 py-0.5 rounded-full active:scale-95 transition-transform"
                                >
                                  🔊
                                </button>
                              </>
                            )}
                            {mm.partOfSpeech && <span className="text-sm font-semibold text-candy-pink uppercase">{cnPartOfSpeech(mm.partOfSpeech)}</span>}
                          </div>
                        )}
                        <p className={isPhrase ? 'text-base text-candy-text text-center' : 'text-base text-candy-text'}>{mm.definition}</p>
                        {mm.example && <p className="text-base font-bold text-candy-text mt-1">{`"${mm.example}"`}</p>}
                        {isPhrase && <div className="border-b-2 border-dashed border-candy-lavender/60 mt-3" />}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-base text-candy-text">{card.back && card.back !== '暂无内容' ? card.back : card.front}</p>
                )}
              </>
            ) : card.type === 'chinese' ? (
              <>
                <p className="text-2xl font-black text-candy-text">{card.front}</p>
                {m.examples && m.examples.length > 0 ? (
                  <div className="space-y-3 mt-1">
                    {m.examples.map((ex: string, i: number) => (
                      <p key={i} className="text-base text-candy-text">💬 {ex}</p>
                    ))}
                  </div>
                ) : card.back && card.back !== '暂无内容' ? (
                  <p className="text-base text-candy-text">{card.back}</p>
                ) : null}
              </>
            ) : (
              <p className="text-base text-candy-text">{card.back && card.back !== '暂无内容' ? card.back : card.front}</p>
            )}
            {m.mnemonic && <p className="text-sm bg-candy-cream rounded-xl p-3 text-candy-text">🧠 {m.mnemonic}</p>}
            {m.analysis && <p className="text-sm bg-candy-cream rounded-xl p-3 text-candy-text">💡 {m.analysis}</p>}
          </div>
        )}
        <p className="text-center text-[11px] text-candy-text-light mt-4">点击翻转 ↺</p>
      </div>
    </div>
  );
}