import { useEffect, useState } from 'react';
import { useCards } from '../../hooks/useCards';
import { useSettings } from '../../hooks/useSettings';
import { cnPartOfSpeech } from '../../services/dictionary';
import { cachedCall, waitCached } from '../../services/ai';
import type { CardType, CardColor } from '../../types';
import type { AIProviderConfig } from '../../services/ai';
import ImageEditor from './ImageEditor';

let lastGen: { tab: CardType; input: string; providerId: string; base64?: string } | null = null;

function genKey(tab: string, word: string, cfg: AIProviderConfig): string {
  return `${tab}:${cfg.id}:${cfg.model}:${word.trim()}`;
}

function finalizeResult(tab: string, input: string, aiResult: any): any {
  if (tab === 'english' || tab === 'chinese') {
    return {
      ...aiResult,
      meanings: (aiResult?.meanings || []).map((m: any) => ({ ...m, word: m.word || input.trim(), partOfSpeech: cnPartOfSpeech(m.partOfSpeech || '') })),
      source: 'ai'
    };
  }
  return aiResult;
}

export default function CreateCard() {
  const { addCard } = useCards();
  const { settings, setActiveAIProvider } = useSettings();
  const [activeTab, setActiveTab] = useState<CardType>('english');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mistakeImageSrc, setMistakeImageSrc] = useState<string | null>(null);
  const [editedMistakeImage, setEditedMistakeImage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const activeProvider: AIProviderConfig | undefined =
    settings.aiProviders.find(p => p.id === settings.aiActiveProviderId) || settings.aiProviders[0];

  useEffect(() => {
    if (!lastGen) return;
    const cfg = settings.aiProviders.find(p => p.id === lastGen!.providerId);
    if (!cfg) return;
    const tab = lastGen.tab;
    const key = genKey(tab, lastGen.input, cfg);
    const factory = () => Promise.resolve<any>(null);
    const pending: Promise<any> | null = waitCached(key, factory);
    if (!pending) return;
    pending.then(raw => {
      if (!raw) return;
      setActiveTab(tab as CardType);
      setInput(tab === 'mistake' ? (raw.question || lastGen!.input) : lastGen!.input);
      setResult(finalizeResult(tab, lastGen!.input, raw));
    }).catch(() => {});
  }, [settings.aiProviders]);

  const handleGenerate = async () => {
    if (!input.trim()) { setError('请输入内容'); return; }
    if (!activeProvider) { setError('请先在「设置」中添加并保存 AI 服务商'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (activeTab === 'english') {
        const dictResult = await import('../../services/dictionary').then(m => m.searchWord(input.trim()));
        if (dictResult && dictResult.meanings.length > 0) {
          setResult({
            word: dictResult.word,
            phonetic: dictResult.phonetic,
            phonetics: dictResult.phonetics,
            wordFamily: [...new Set(dictResult.meanings.map((m: any) => m.word).filter((w: string) => w && w !== dictResult.word))] as string[],
            meanings: dictResult.meanings.flatMap((m: any) =>
              m.definitions.map((d: any) => ({
                word: m.word,
                partOfSpeech: m.partOfSpeech,
                definition: d.definition,
                example: d.example
              }))
            ),
            source: 'api'
          });
          lastGen = { tab: 'english', input: input.trim(), providerId: activeProvider.id };
        } else {
          const key = genKey('english', input.trim(), activeProvider);
          lastGen = { tab: 'english', input: input.trim(), providerId: activeProvider.id };
          const aiResult = await cachedCall(key, () =>
            import('../../services/ai').then(m => m.generateWordCard(input.trim(), activeProvider))
          );
          setResult(finalizeResult('english', input.trim(), aiResult));
        }
      } else if (activeTab === 'chinese') {
        const key = genKey('chinese', input.trim(), activeProvider);
        lastGen = { tab: 'chinese', input: input.trim(), providerId: activeProvider.id };
        const aiResult = await cachedCall(key, () =>
          import('../../services/ai').then(m => m.generateChineseCard(input.trim(), activeProvider))
        );
        setResult(finalizeResult('chinese', input.trim(), aiResult));
      }
    } catch (e: any) {
      setError(e.message || '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleMistake = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    setEditedMistakeImage(null);

    try {
      const base64 = await readFileAsBase64(file);
      setMistakeImageSrc(base64);
      setShowEditor(true);
    } catch (e: any) {
      setError(e.message || '读取图片失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorConfirm = (editedBase64: string) => {
    setEditedMistakeImage(editedBase64);
    setShowEditor(false);
    setInput('');
    setResult(null);
  };

  const handleSave = () => {
    const isMistake = activeTab === 'mistake';
    const front = isMistake ? (editedMistakeImage || mistakeImageSrc || '') : input.trim();
    const back = isMistake ? (input.trim() || '暂无内容') : (result?.answer || result?.analysis || '暂无内容');

    const colorMap: Record<string, CardColor> = {
      english: 'pink', chinese: 'blue', mistake: 'yellow', custom: 'mint'
    };

    addCard({
      type: activeTab,
      front: front.trim() || '暂无内容',
      back: back.trim() || '暂无内容',
      metadata: {
        imageUrl: isMistake ? (editedMistakeImage || mistakeImageSrc || undefined) : undefined,
      },
      category: '默认',
      tags: [],
      difficulty: 2.5,
      source: 'manual',
      color: colorMap[activeTab] || 'pink'
    }).then(() => {
      setInput('');
      setResult(null);
      setMistakeImageSrc(null);
      setEditedMistakeImage(null);
      alert('✅ 卡片创建成功！');
    });
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-black text-candy-text">创建卡片</h2>

      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'english', label: '🔤 英语单词', desc: '查词 + AI 生成' },
          { id: 'chinese', label: '🀄 中文词语', desc: 'AI 生成' },
          { id: 'mistake', label: '❌ 错题拍照', desc: '手动裁剪' },
          { id: 'custom', label: '✏️ 自定义', desc: '手动填写' }
        ] as { id: CardType; label: string; desc: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id as CardType); setResult(null); setInput(''); }}
            className={`px-4 py-3 rounded-2xl text-left transition-all min-w-[120px]
              ${activeTab === t.id
                ? 'bg-candy-pink text-white shadow-soft'
                : 'bg-candy-card text-candy-text shadow-card hover:shadow-soft'}`}
          >
            <p className="font-bold text-sm">{t.label}</p>
            <p className={`text-xs ${activeTab === t.id ? 'text-white/70' : 'text-candy-text-light'}`}>{t.desc}</p>
          </button>
        ))}
      </div>

      {(activeTab === 'english' || activeTab === 'chinese') && (
        <div>
          <label className="block text-sm font-bold text-candy-text mb-1">
            {activeTab === 'english' ? '输入英语单词' : '输入中文词语'}
          </label>
          {settings.aiProviders.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-candy-text-light flex-shrink-0">🤖 AI 服务商</span>
              <select
                value={activeProvider?.id || ''}
                onChange={e => {
                  setActiveAIProvider(e.target.value);
                  setResult(null);
                }}
                className="flex-1 px-3 py-2 rounded-xl border-2 border-candy-pink/20 bg-candy-cream text-sm font-bold text-candy-text"
              >
                {settings.aiProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.apiKey ? '' : '（未填 Key）'}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={activeTab === 'english' ? '例如: hello, run, beautiful...' : '例如: 勤奋、坚持...'}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-candy-pink/20 focus:border-candy-pink focus:outline-none bg-candy-card"
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-candy-pink text-white font-bold px-6 rounded-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? '⏳' : '✨ 生成'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'mistake' && (
        <div>
          <label className="block text-sm font-bold text-candy-text mb-1">拍照上传错题</label>
          {editedMistakeImage ? (
            <div className="space-y-3">
              <img src={editedMistakeImage} alt="裁剪后" className="w-full max-h-48 object-contain rounded-2xl border-2 border-candy-pink/20" />
              <label className="block text-sm font-bold text-candy-text mb-1">答案（手动填写）</label>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="输入正确答案..."
                className="w-full px-4 py-3 rounded-xl border-2 border-candy-pink/30 focus:border-candy-pink focus:outline-none bg-candy-card text-candy-text"
              />
              <button
                onClick={() => { setEditedMistakeImage(null); setMistakeImageSrc(null); setInput(''); setResult(null); }}
                className="w-full bg-candy-card text-candy-text font-bold py-3 rounded-xl active:scale-95 transition-transform"
              >
                🔄 重新拍照
              </button>
            </div>
          ) : mistakeImageSrc && !showEditor ? (
            <div className="space-y-3">
              <img src={mistakeImageSrc} alt="错题预览" className="w-full max-h-48 object-contain rounded-2xl border-2 border-candy-pink/20" />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditor(true)}
                  className="flex-1 bg-candy-pink text-white font-bold py-3 rounded-xl active:scale-95 transition-all"
                >
                  📐 裁剪图片
                </button>
                <button
                  onClick={() => { setMistakeImageSrc(null); setEditedMistakeImage(null); setResult(null); setInput(''); }}
                  className="flex-1 bg-candy-card text-candy-text font-bold py-3 rounded-xl active:scale-95 transition-transform"
                >
                  🔄 重新拍照
                </button>
              </div>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-candy-pink/30 rounded-2xl p-8 text-center cursor-pointer hover:border-candy-pink transition-colors bg-candy-card">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm text-candy-text-light">点击拍照或选择图片</p>
              <p className="text-xs text-candy-text-light mt-1">支持 JPG、PNG 格式</p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleMistake}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}

      {activeTab === 'custom' && (
        <button
          onClick={() => (window.location.hash = '#/editor')}
          className="w-full bg-candy-card text-candy-text font-bold py-4 rounded-2xl shadow-card active:scale-95 transition-transform"
        >
          ✏️ 手动编辑卡片
        </button>
      )}

      {result && (
        <div className="bg-candy-card rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-candy-text">生成结果</h3>
            <span className="text-xs text-candy-text-light bg-candy-mint/30 px-2 py-1 rounded-full">
              {result.source === 'api' ? '📚 来自词典' : '🤖 AI 生成'}
            </span>
          </div>

          {result.word && (
            <div className="mb-3">
              <p className="text-2xl font-black text-candy-text">{result.word}</p>
              {result.phonetic && <p className="text-candy-pink font-mono text-sm mt-1">{result.phonetic}</p>}
            </div>
          )}

          {result.pinyin && (
            <p className="text-candy-pink font-mono text-sm mb-2">拼音: {result.pinyin}</p>
          )}

          {result.examples && (result.examples as string[]).length > 0 && (
            <div className="space-y-2 mb-3">
              {(result.examples as string[]).map((ex: string, i: number) => (
                <p key={i} className="text-sm text-candy-text bg-candy-cream rounded-xl p-3">💬 {ex}</p>
              ))}
            </div>
          )}

          {result.meanings && result.meanings.length > 0 && (
            <div className="space-y-2 mb-3">
              {result.meanings.map((m: any, i: number) => {
                const isPhrase = (input || '').trim().split(/\s+/).length > 1;
                return (
                  <div key={i} className="bg-candy-cream rounded-xl p-3">
                    {!isPhrase && m.word && m.word.toLowerCase() !== input.trim().toLowerCase() && (
                      <span className="text-sm font-black text-candy-text mr-2">{m.word}</span>
                    )}
                    {!isPhrase && <span className="text-xs font-bold text-candy-pink uppercase">{m.partOfSpeech}</span>}
                    <p className="text-sm text-candy-text mt-1">{m.definition}</p>
                    {m.example && <p className="text-xs text-candy-text-light italic mt-1">"{m.example}"</p>}
                  </div>
                );
              })}
            </div>
          )}

          {result.analysis && (
            <div className="bg-candy-mint/30 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-candy-text">解析</p>
              <p className="text-sm text-candy-text mt-1">{result.analysis}</p>
            </div>
          )}

          {result.mnemonic && (
            <div className="bg-candy-yellow/30 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-candy-text">记忆技巧</p>
              <p className="text-sm text-candy-text mt-1">{result.mnemonic}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-candy-pink to-candy-peach text-white font-bold py-3 rounded-2xl shadow-soft active:scale-95 transition-transform"
          >
            💾 保存为卡片
          </button>
        </div>
      )}

      {(activeTab === 'mistake' && editedMistakeImage) && (
        <div className="bg-candy-card rounded-2xl p-4 shadow-card">
          <h3 className="font-bold text-candy-text mb-2">裁剪完成</h3>
          <p className="text-sm text-candy-text-light mb-3">请填写答案后保存卡片</p>
          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-candy-pink to-candy-peach text-white font-bold py-3 rounded-2xl shadow-soft active:scale-95 transition-transform"
          >
            💾 保存为卡片
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      {loading && (
        <p className="text-center text-candy-text-light text-sm animate-pulse">
          ⏳ 加载中...
        </p>
      )}
      {showEditor && mistakeImageSrc && (
        <ImageEditor
          imageSrc={mistakeImageSrc}
          onConfirm={handleEditorConfirm}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
