import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { AI_PROVIDERS, createProviderFromPreset, testAIConnection, type AIProviderConfig } from '../../services/ai';

function newCustomProvider(): AIProviderConfig {
  return { id: crypto.randomUUID(), name: '自定义', baseUrl: '', apiKey: '', model: '' };
}

export default function Settings() {
  const { settings, save, exportData, importData,
    addAIProvider, updateAIProvider, removeAIProvider, setActiveAIProvider } = useSettings();
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AIProviderConfig | null>(null);

  const startEdit = (cfg: AIProviderConfig) => {
    setDraft({ ...cfg });
    setEditingId(cfg.id);
  };

  const saveEdit = () => {
    if (!draft) return;
    if (settings.aiProviders.some(c => c.id === draft.id)) {
      updateAIProvider(draft);
    } else {
      addAIProvider(draft);
    }
    setEditingId(null);
    setDraft(null);
  };

  const activeId = settings.aiActiveProviderId;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-black text-candy-text">设置</h2>

      <div className="bg-candy-card rounded-2xl p-4 shadow-card">
        <h3 className="font-bold text-candy-text mb-1 flex items-center gap-2">🤖 AI 服务商</h3>
        <p className="text-xs text-candy-text-light mb-3">保存多套服务商+Key，建卡时随意切换</p>

        <div className="space-y-3">
          {settings.aiProviders.map(cfg => (
            <div key={cfg.id} className="border-2 border-candy-pink/10 rounded-xl p-3">
              {editingId === cfg.id && draft ? (
                <AIProviderEditor
                  draft={draft}
                  onChange={setDraft}
                  onSave={saveEdit}
                  onCancel={() => { setEditingId(null); setDraft(null); }}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-candy-text">
                      {cfg.name}
                      {activeId === cfg.id && <span className="ml-2 text-xs bg-candy-pink/10 text-candy-pink px-2 py-0.5 rounded-full">当前</span>}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setActiveAIProvider(cfg.id)}
                        className={`text-xs px-2 py-1 rounded-lg ${activeId === cfg.id ? 'text-candy-text-light' : 'bg-candy-mint text-candy-text font-bold'}`}>
                        {activeId === cfg.id ? '✓ 使用中' : '设为当前'}
                      </button>
                      <button onClick={() => startEdit(cfg)} className="text-xs text-candy-text-light hover:text-candy-pink px-1">✏️</button>
                      <button onClick={() => removeAIProvider(cfg.id)} className="text-xs text-candy-text-light hover:text-red-500 px-1">🗑️</button>
                    </div>
                  </div>
                  <p className="text-xs text-candy-text-light truncate">{cfg.baseUrl || '(未填地址)'}</p>
                  <p className="text-xs text-candy-text-light">模型: {cfg.model || '—'}
                    {cfg.visionModel ? ` · 视觉: ${cfg.visionModel}` : ''}</p>
                  <p className="text-xs text-candy-text-light">Key: {cfg.apiKey ? '••••••' + cfg.apiKey.slice(-4) : '未设置'}</p>
                </>
              )}
            </div>
          ))}

          {editingId && draft && !settings.aiProviders.some(c => c.id === editingId) && (
            <div className="border-2 border-candy-pink/30 rounded-xl p-3">
              <AIProviderEditor
                draft={draft}
                isNew
                onChange={setDraft}
                onSave={saveEdit}
                onCancel={() => { setEditingId(null); setDraft(null); }}
              />
            </div>
          )}

          {settings.aiProviders.length === 0 && (
            <p className="text-sm text-candy-text-light text-center py-2">还没有服务商，点击下面添加</p>
          )}

          <div>
            <p className="text-xs font-bold text-candy-text mb-1">快速添加（自带默认配置）</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {AI_PROVIDERS.filter(p => p.id !== 'custom').map(p => (
                <button
                  key={p.id}
                  onClick={() => startEdit(createProviderFromPreset(p))}
                  className="text-xs bg-candy-cream text-candy-text font-bold px-3 py-1.5 rounded-full hover:bg-candy-pink/10"
                >
                  + {p.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => startEdit(newCustomProvider())}
              className="w-full bg-candy-mint text-candy-text text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
            >
              ＋ 添加自定义服务商
            </button>
          </div>
        </div>
      </div>

      <div className="bg-candy-card rounded-2xl p-4 shadow-card">
        <h3 className="font-bold text-candy-text mb-3 flex items-center gap-2">🗣️ 发音设置</h3>
        <div className="flex gap-2">
          {([
            { id: 'uk', label: '🇬🇧 英音' },
            { id: 'us', label: '🇺🇸 美音' }
          ] as { id: 'uk' | 'us'; label: string }[]).map(a => (
            <button
              key={a.id}
              onClick={() => save('accent', a.id)}
              className={`flex-1 py-3 rounded-xl font-bold transition-all active:scale-95
                ${settings.accent === a.id
                  ? 'bg-candy-pink text-white shadow-soft'
                  : 'bg-candy-cream text-candy-text hover:bg-candy-pink/10'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-candy-text-light mt-2">
          用于挑选取词接口的真人发音文件；无 mp3 时 TTS 按此口音朗读
        </p>
      </div>

      <div className="bg-candy-card rounded-2xl p-4 shadow-card">
        <h3 className="font-bold text-candy-text mb-3 flex items-center gap-2">📚 词典设置</h3>
        <div>
          <label className="block text-sm font-bold text-candy-text mb-1">剑桥词典代理（可选）</label>
          <input
            type="text"
            value={settings.cambridgeProxyUrl}
            onChange={e => save('cambridgeProxyUrl', e.target.value)}
            placeholder="https://your-proxy.com/?url="
            className="w-full px-4 py-3 rounded-xl border-2 border-candy-blue/20 focus:border-candy-blue focus:outline-none bg-candy-cream text-sm"
          />
          <button
            onClick={() => save('cambridgeProxyUrl', 'https://api.allorigins.win/raw?url=')}
            className={`mt-2 text-xs font-bold px-3 py-2 rounded-full transition-all ${
              settings.cambridgeProxyUrl === 'https://api.allorigins.win/raw?url='
                ? 'bg-candy-mint text-candy-text'
                : 'bg-candy-cream text-candy-text hover:bg-candy-mint/40'
            }`}
          >
            {settings.cambridgeProxyUrl === 'https://api.allorigins.win/raw?url=' ? '✓ 使用中' : '⚡ 一键使用公共代理'}
          </button>
          <p className="text-xs text-candy-text-light mt-1">
            公共代理为免费第三方服务，可能不稳定；也可输入自建的 Cloudflare Worker 地址
          </p>
          <p className="text-xs text-candy-text-light mt-0.5">
            留空则只使用 Free Dictionary API
          </p>
        </div>
      </div>

      <div className="bg-candy-card rounded-2xl p-4 shadow-card">
        <h3 className="font-bold text-candy-text mb-3 flex items-center gap-2">📅 艾宾浩斯设置</h3>
        <div>
          <label className="block text-sm font-bold text-candy-text mb-1">复习间隔（天）</label>
          <input
            type="text"
            value={(settings.schedules as number[]).join(', ')}
            onChange={e => {
              const nums = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
              save('schedules', nums);
            }}
            className="w-full px-4 py-3 rounded-xl border-2 border-candy-mint/20 focus:border-candy-mint focus:outline-none bg-candy-cream text-sm font-mono"
          />
        </div>
      </div>

      <div className="bg-candy-card rounded-2xl p-4 shadow-card">
        <h3 className="font-bold text-candy-text mb-3 flex items-center gap-2">💾 数据管理</h3>
        <div className="space-y-3">
          <button
            onClick={exportData}
            className="w-full bg-candy-blue text-candy-text font-bold py-3 rounded-xl active:scale-95 transition-transform"
          >
            📤 导出数据
          </button>
          <label className="w-full block">
            <input
              type="file"
              accept=".json"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportLoading(true);
                try {
                  const count = await importData(file);
                  setImportResult(count);
                  setTimeout(() => setImportResult(null), 3000);
                } catch {
                  setImportResult(-1);
                } finally {
                  setImportLoading(false);
                }
              }}
              className="hidden"
            />
            <span className="w-full bg-candy-mint text-candy-text font-bold py-3 rounded-xl block text-center cursor-pointer active:scale-95 transition-transform">
              📥 导入数据
            </span>
          </label>
          {importResult !== null && (
            <p className={`text-center text-sm ${importResult > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {importResult > 0 ? `成功导入 ${importResult} 张卡片！` : '导入失败'}
            </p>
          )}
          {importLoading && <p className="text-center text-sm text-candy-text-light">导入中...</p>}
        </div>
      </div>

      <div className="bg-candy-card rounded-2xl p-4 shadow-card text-center">
        <div className="text-4xl mb-2">🦊</div>
        <h3 className="font-bold text-candy-text">AI闪卡记忆卡</h3>
        <p className="text-xs text-candy-text-light mt-1">版本 0.1.0</p>
        <p className="text-xs text-candy-text-light mt-2">基于艾宾浩斯记忆法 · AI 智能建卡</p>
        <p className="text-xs text-candy-text-light mt-1">© 2026 · 为学习而生</p>
      </div>
    </div>
  );
}

function AIProviderEditor({ draft, onChange, onSave, onCancel, isNew }: {
  draft: AIProviderConfig;
  onChange: (d: AIProviderConfig) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-candy-text mb-2">{isNew ? '🆕 新增服务商' : '✏️ 编辑服务商'}</p>
      <div className="space-y-2">
        <input type="text" value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })}
          placeholder="名称" className="w-full px-3 py-2 rounded-lg border-2 border-candy-pink/20 bg-candy-cream text-sm font-bold" />
        <input type="text" value={draft.baseUrl} onChange={e => onChange({ ...draft, baseUrl: e.target.value })}
          placeholder="API 地址" className="w-full px-3 py-2 rounded-lg border-2 border-candy-pink/20 bg-candy-cream text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={draft.model} onChange={e => onChange({ ...draft, model: e.target.value })}
            placeholder="模型" className="px-3 py-2 rounded-lg border-2 border-candy-pink/20 bg-candy-cream text-sm" />
          <input type="text" value={draft.visionModel || ''} onChange={e => onChange({ ...draft, visionModel: e.target.value })}
            placeholder="视觉模型(可选)" className="px-3 py-2 rounded-lg border-2 border-candy-pink/20 bg-candy-cream text-sm" />
        </div>
        <input type="password" value={draft.apiKey} onChange={e => onChange({ ...draft, apiKey: e.target.value })}
          placeholder="API Key" className="w-full px-3 py-2 rounded-lg border-2 border-candy-pink/20 bg-candy-cream text-sm" />
        <div className="flex gap-2">
          <button onClick={onSave} className="flex-1 bg-candy-pink text-white text-sm font-bold py-2 rounded-lg">保存</button>
          <button onClick={onCancel} className="flex-1 bg-candy-blue text-candy-text text-sm font-bold py-2 rounded-lg">取消</button>
        </div>
        <TestButton draft={draft} />
      </div>
    </div>
  );
}

function TestButton({ draft }: { draft: AIProviderConfig }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState('');
  return (
    <div>
      <button
        onClick={async () => {
          setTesting(true);
          setResult('');
          const r = await testAIConnection(draft);
          setResult(r);
          setTesting(false);
        }}
        className="w-full bg-candy-cream text-candy-text text-sm font-bold py-2 rounded-lg hover:bg-candy-pink/10"
      >
        {testing ? '测试中…' : '🔌 测试连接'}
      </button>
      {result && (
        <p className={`text-xs mt-1 break-all ${result.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{result}</p>
      )}
    </div>
  );
}
