import { useEffect, useState } from 'react';
import { useCards } from '../../hooks/useCards';
import type { FlashCard, ReviewLog } from '../../types';

export default function Dashboard() {
  const { cards, reviews, getDueCards, getTodayStats } = useCards();
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    getDueCards().then(c => setDueCount(c.length));
  }, [cards, reviews, getDueCards]);

  const stats = getTodayStats();
  const hotData = generateHotmap(reviews);

  const forgetCounts = new Map<string, number>();
  reviews.forEach(r => {
    if (r.rating === 'forget') forgetCounts.set(r.cardId, (forgetCounts.get(r.cardId) || 0) + 1);
  });
  const topForgotten = cards
    .map(c => ({ card: c, count: forgetCounts.get(c.id) || 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count || a.card.createdAt - b.card.createdAt)
    .slice(0, 5);

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <div className="text-center">
        <div className="text-5xl mb-2 animate-float">🦊</div>
        <h1 className="text-2xl font-extrabold text-candy-text">AI闪卡记忆卡</h1>
        <p className="text-candy-text-light text-sm mt-1">{dateStr} 周{weekday}</p>
      </div>

      <div className="bg-gradient-to-br from-candy-pink to-candy-peach rounded-2xl p-5 text-white shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">今日待复习</p>
            <p className="text-5xl font-black mt-1">{dueCount}</p>
            <p className="text-white/70 text-xs mt-1">张卡片</p>
          </div>
          <div className="text-6xl">📚</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="今日已学" value={stats.total} icon="✅" color="from-candy-mint to-green-200" />
        <StatCard label="正确率" value={stats.total > 0 ? `${Math.round(stats.correct / stats.total * 100)}%` : '-'} icon="🎯" color="from-candy-blue to-blue-200" />
        <StatCard label="连续打卡" value={`${stats.streak}天`} icon="🔥" color="from-candy-yellow to-orange-200" />
      </div>

      <div className="bg-candy-card rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-candy-text">学习热力图</h3>
          <span className="text-xs text-candy-text-light">近30天</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {hotData.map((day, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getHeatColor(parseInt(day)) }}
              title={`${day}次`}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-candy-text">最常遗忘</h3>
          <span className="text-xs text-candy-text-light">按遗忘次数排序</span>
        </div>
        <div className="space-y-2">
          {topForgotten.map(({ card, count }) => (
            <div key={card.id} className="bg-candy-card rounded-xl p-3 shadow-card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                ${card.color === 'pink' ? 'bg-candy-pink' :
                  card.color === 'blue' ? 'bg-candy-blue' :
                  card.color === 'yellow' ? 'bg-candy-yellow' :
                  card.color === 'mint' ? 'bg-candy-mint' :
                  card.color === 'lavender' ? 'bg-candy-lavender' : 'bg-candy-peach'}`}>
                {getCardEmoji(card.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-candy-text truncate">
                  {card.type === 'chinese'
                    ? getChineseWord(card)
                    : card.type === 'mistake'
                    ? (card.back && card.back !== '暂无内容' ? card.back : '错题')
                    : card.front}
                </p>
                <p className="text-xs text-candy-text-light truncate">
                  {card.type === 'english'
                    ? (card.metadata?.meanings?.[0]?.definition || getTypeLabel(card.type))
                    : card.type === 'chinese'
                    ? (card.metadata?.pinyin || card.front)
                    : getTypeLabel(card.type)}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs bg-candy-peach/40 text-candy-text px-2 py-1 rounded-full font-bold">
                😵 {count}次
              </span>
            </div>
          ))}
          {topForgotten.length === 0 && (
            <div className="text-center py-8 text-candy-text-light">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm">还没有遗忘记录，继续保持！</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-center`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xl font-black text-candy-text">{value}</p>
      <p className="text-xs text-candy-text-light">{label}</p>
    </div>
  );
}

function getHeatColor(count: number): string {
  if (count === 0) return '#E5E5E5';
  if (count <= 3) return '#C7F9CC';
  if (count <= 7) return '#B5DEFF';
  if (count <= 14) return '#FF9AA2';
  return '#FFDAC1';
}

function generateHotmap(reviews: ReviewLog[]): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d.getTime() + 86400000);
    const count = reviews.filter(r => r.createdAt >= d.getTime() && r.createdAt < next.getTime()).length;
    days.push(String(count));
  }
  return days;
}

function getCardEmoji(type: string): string {
  return type === 'english' ? '🔤' : type === 'chinese' ? '🀄' : type === 'mistake' ? '❌' : '✏️';
}

function getTypeLabel(type: string): string {
  return type === 'english' ? '英语单词' : type === 'chinese' ? '中文词语' : type === 'mistake' ? '错题' : '自定义';
}

function getChineseWord(card: FlashCard): string {
  const first = (card.back || '').split('\n')[0]?.trim();
  return first || card.front;
}
