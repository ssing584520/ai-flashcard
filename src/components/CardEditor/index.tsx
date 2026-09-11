import { useState } from 'react';
import { useCards } from '../../hooks/useCards';
import type { CardType, CardColor } from '../../types';

export default function CardEditor({ type: initialType = 'english', onSuccess }: { type?: CardType; onSuccess?: () => void }) {
  const { addCard } = useCards();
  const [form, setForm] = useState({
    type: initialType,
    front: '',
    back: '',
    phonetic: '',
    meanings: [] as { partOfSpeech: string; definition: string; example?: string }[],
    pinyin: '',
    imageUrl: '',
    subject: '',
    analysis: '',
    mnemonic: '',
    examples: [] as string[],
    category: '默认',
    tags: '',
    color: 'pink' as CardColor
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSave = async () => {
    if (!form.front.trim()) {
      setError('请填写正面内容');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addCard({
        type: form.type,
        front: form.front.trim(),
        back: form.back.trim() || '暂无内容',
        metadata: {
          phonetic: form.phonetic,
          meanings: form.meanings,
          pinyin: form.pinyin,
          imageUrl: form.imageUrl,
          subject: form.subject as any,
          analysis: form.analysis,
          mnemonic: form.mnemonic,
          examples: form.examples
        },
        category: form.category || '默认',
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        difficulty: 2.5,
        source: 'manual',
        color: form.color
      });
      if (onSuccess) onSuccess();
      else window.location.hash = '#/library';
    } catch (e) {
      setError('保存失败，请重试');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-black text-candy-text">
        {form.type === 'english' ? '🔤 英语单词' : form.type === 'chinese' ? '🀄 中文词语' : form.type === 'mistake' ? '❌ 错题卡' : '✏️ 自定义'}
      </h2>

      <div className="flex gap-2 flex-wrap">
        {(['english', 'chinese', 'mistake', 'custom'] as CardType[]).map(t => (
          <button
            key={t}
            onClick={() => update('type', t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all
              ${form.type === t ? 'bg-candy-pink text-white' : 'bg-candy-card text-candy-text-light shadow-card'}`}
          >
            {t === 'english' ? '🔤 英语' : t === 'chinese' ? '🀄 中文' : t === 'mistake' ? '❌ 错题' : '✏️ 自定义'}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-bold text-candy-text mb-1">正面（问题）</label>
        <input
          type="text"
          value={form.front}
          onChange={e => update('front', e.target.value)}
          placeholder={form.type === 'mistake' ? '输入题目描述...' : '输入单词或词语...'}
          className="w-full px-4 py-3 rounded-xl border-2 border-candy-pink/30 focus:border-candy-pink focus:outline-none bg-candy-card text-candy-text"
        />
      </div>

      {form.type === 'english' && (
        <>
          <div>
            <label className="block text-sm font-bold text-candy-text mb-1">音标</label>
            <input
              type="text"
              value={form.phonetic || ''}
              onChange={e => update('phonetic', e.target.value)}
              placeholder="/həˈloʊ/"
              className="w-full px-4 py-3 rounded-xl border-2 border-candy-blue/30 focus:border-candy-blue focus:outline-none bg-candy-card font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-candy-text mb-1">释义（每行一个：词性 - 释义 - 例句可选）</label>
            <textarea
              value={form.meanings.map((m: any) => `${m.partOfSpeech} - ${m.definition}${m.example ? ' - ' + m.example : ''}`).join('\n')}
              onChange={e => {
                const lines = e.target.value.split('\n').filter(Boolean);
                const meanings = lines.map((line: string) => {
                  const parts = line.split(' - ');
                  return {
                    partOfSpeech: parts[0]?.trim() || '',
                    definition: parts[1]?.trim() || '',
                    example: parts[2]?.trim() || undefined
                  };
                });
                update('meanings', meanings);
              }}
              rows={4}
              placeholder="n. - 问候；打招呼&#10;v. - 向...打招呼"
              className="w-full px-4 py-3 rounded-xl border-2 border-candy-blue/30 focus:border-candy-blue focus:outline-none bg-candy-card"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-candy-text mb-1">记忆技巧（可选）</label>
            <textarea
              value={form.mnemonic || ''}
              onChange={e => update('mnemonic', e.target.value)}
              placeholder="谐音、词根词缀、联想记忆..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-candy-yellow/30 focus:border-candy-yellow focus:outline-none bg-candy-card"
            />
          </div>
        </>
      )}

      {form.type === 'chinese' && (
        <>
          <div>
            <label className="block text-sm font-bold text-candy-text mb-1">拼音</label>
            <input
              type="text"
              value={form.pinyin || ''}
              onChange={e => update('pinyin', e.target.value)}
              placeholder="nǐ hǎo"
              className="w-full px-4 py-3 rounded-xl border-2 border-candy-mint/30 focus:border-candy-mint focus:outline-none bg-candy-card font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-candy-text mb-1">释义（每行一个）</label>
            <textarea
              value={form.meanings.map((m: any) => m.definition).join('\n') || ''}
              onChange={e => {
                const lines = e.target.value.split('\n').filter(Boolean);
                update('meanings', lines.map((l: string) => ({ partOfSpeech: '', definition: l })));
              }}
              rows={3}
              placeholder="问候；你好"
              className="w-full px-4 py-3 rounded-xl border-2 border-candy-mint/30 focus:border-candy-mint focus:outline-none bg-candy-card"
            />
          </div>
        </>
      )}

      {form.type === 'mistake' && (
        <>
          {form.imageUrl && (
            <div className="mb-2">
              <img src={form.imageUrl} alt="错题" className="w-full max-h-40 object-contain rounded-xl border-2 border-candy-pink/20" />
            </div>
          )}
          <label className="block text-sm font-bold text-candy-text mb-1">
            {form.imageUrl ? '更换错题图片' : '上传错题图片'}
          </label>
          <label className="block border-2 border-dashed border-candy-pink/30 rounded-2xl p-6 text-center cursor-pointer hover:border-candy-pink transition-colors bg-candy-card mb-3">
            <div className="text-3xl mb-1">📷</div>
            <p className="text-xs text-candy-text-light">点击上传图片</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => update('imageUrl', reader.result as string);
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
          </label>
          <div>
            <label className="block text-sm font-bold text-candy-text mb-1">答案</label>
            <input
              type="text"
              value={form.back}
              onChange={e => update('back', e.target.value)}
              placeholder="正确答案..."
              className="w-full px-4 py-3 rounded-xl border-2 border-candy-pink/30 focus:border-candy-pink focus:outline-none bg-candy-card"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-candy-text mb-1">解析</label>
            <textarea
              value={form.analysis || ''}
              onChange={e => update('analysis', e.target.value)}
              placeholder="详细解析过程..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-candy-yellow/30 focus:border-candy-yellow focus:outline-none bg-candy-card"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-candy-text mb-1">科目</label>
            <select
              value={form.subject || ''}
              onChange={e => update('subject', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-candy-blue/30 focus:border-candy-blue focus:outline-none bg-candy-card"
            >
              <option value="">选择科目</option>
              <option value="数学">📐 数学</option>
              <option value="语文">📖 语文</option>
              <option value="英语">🔤 英语</option>
              <option value="科学">🔬 科学</option>
              <option value="其他">📝 其他</option>
            </select>
          </div>
        </>
      )}

      {form.type === 'custom' && (
        <div>
          <label className="block text-sm font-bold text-candy-text mb-1">背面（答案）</label>
          <textarea
            value={form.back}
            onChange={e => update('back', e.target.value)}
            placeholder="输入答案内容..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border-2 border-candy-lavender/30 focus:border-candy-lavender focus:outline-none bg-candy-card"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-candy-text mb-1">分类</label>
          <input
            type="text"
            value={form.category}
            onChange={e => update('category', e.target.value)}
            placeholder="分类名"
            className="w-full px-4 py-3 rounded-xl border-2 border-candy-pink/20 focus:border-candy-pink focus:outline-none bg-candy-card"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-candy-text mb-1">标签（逗号分隔）</label>
          <input
            type="text"
            value={form.tags}
            onChange={e => update('tags', e.target.value)}
            placeholder="标签1, 标签2"
            className="w-full px-4 py-3 rounded-xl border-2 border-candy-pink/20 focus:border-candy-pink focus:outline-none bg-candy-card"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-candy-text mb-2">卡片颜色</label>
        <div className="flex gap-3">
          {(['pink', 'blue', 'yellow', 'mint', 'lavender', 'peach'] as CardColor[]).map(c => (
            <button
              key={c}
              onClick={() => update('color', c)}
              className={`w-10 h-10 rounded-full ${c === 'pink' ? 'bg-candy-pink' : c === 'blue' ? 'bg-candy-blue' : c === 'yellow' ? 'bg-candy-yellow' : c === 'mint' ? 'bg-candy-mint' : c === 'lavender' ? 'bg-candy-lavender' : 'bg-candy-peach'} ${form.color === c ? 'ring-4 ring-offset-2 ring-candy-pink' : ''} transition-all`}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-to-r from-candy-pink to-candy-peach text-white font-bold py-4 rounded-2xl shadow-soft active:scale-95 transition-all disabled:opacity-50"
      >
        {saving ? '保存中...' : '💾 保存卡片'}
      </button>
    </div>
  );
}
