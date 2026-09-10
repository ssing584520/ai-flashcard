import { useState, useCallback, useEffect } from 'react';
import { db } from '../services/db';
import { extendSchedules } from '../services/srs';
import { AI_PROVIDERS, createProviderFromPreset, type AIProviderConfig } from '../services/ai';

export function useSettings() {
  const [settings, setSettings] = useState({
    openrouterApiKey: '',
    aiProviders: [] as AIProviderConfig[],
    aiActiveProviderId: '',
    eudicApiKey: '',
    cambridgeProxyUrl: '',
    schedules: [1, 2, 4, 7, 15, 30, 60, 90] as number[],
    theme: 'light' as 'light' | 'dark',
    dailyGoal: 20,
    accent: 'us' as 'uk' | 'us'
  });
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const keys = ['openrouterApiKey', 'eudicApiKey', 'cambridgeProxyUrl'] as const;
    const loadedSettings: any = {};
    for (const key of keys) {
      try {
        const val = localStorage.getItem(key);
        if (val) loadedSettings[key] = val;
      } catch {}
    }
    try {
      const raw = localStorage.getItem('aiProviders');
      if (raw) {
        const parsed = JSON.parse(raw) as AIProviderConfig[];
        if (Array.isArray(parsed)) loadedSettings.aiProviders = parsed;
      }
    } catch {}
    try {
      const activeId = localStorage.getItem('aiActiveProviderId');
      if (activeId) loadedSettings.aiActiveProviderId = activeId;
    } catch {}
    if (!loadedSettings.aiProviders || loadedSettings.aiProviders.length === 0) {
      const legacyKey = localStorage.getItem('aiApiKey') || localStorage.getItem('openrouterApiKey');
      if (legacyKey) {
        const legacyId = localStorage.getItem('aiProvider');
        const preset = AI_PROVIDERS.find(p => p.id === legacyId) || AI_PROVIDERS[0];
        loadedSettings.aiProviders = [{
          ...createProviderFromPreset(preset),
          apiKey: legacyKey,
          name: preset.name === '自定义' ? (localStorage.getItem('aiModel') || '自定义') : preset.name,
          baseUrl: preset.name === '自定义' ? (localStorage.getItem('aiBaseUrl') || '') : preset.baseUrl
        }];
        loadedSettings.aiActiveProviderId = loadedSettings.aiProviders[0].id;
        ['aiProvider', 'aiApiKey', 'aiBaseUrl', 'aiModel', 'openrouterApiKey'].forEach(k => {
          try { localStorage.removeItem(k); } catch {}
        });
      }
    }
    try {
      const schedules = localStorage.getItem('schedules');
      if (schedules && (JSON.parse(schedules) as number[]).length > 0) {
        const parsedSchedules = JSON.parse(schedules) as number[];
        loadedSettings.schedules = extendSchedules(parsedSchedules.some(v => v >= 120)
          ? [...new Set(parsedSchedules.map(v => Math.max(1, Math.round(v / 1440))))]
          : parsedSchedules);
      }
    } catch {}
    try {
      const accent = localStorage.getItem('accent');
      if (accent === 'uk' || accent === 'us') loadedSettings.accent = accent;
    } catch {}
    setSettings(prev => ({ ...prev, ...loadedSettings }));
    setLoaded(true);
  }, []);

  const save = useCallback(async (key: string, value: string | number | number[]) => {
    try {
      if (typeof value === 'string' && (key === 'openrouterApiKey' || key === 'eudicApiKey' || key === 'cambridgeProxyUrl')) {
        localStorage.setItem(key, value);
      } else if (key === 'schedules' && Array.isArray(value)) {
        localStorage.setItem('schedules', JSON.stringify(value));
      } else if (key === 'accent' && (value === 'uk' || value === 'us')) {
        localStorage.setItem('accent', value);
      }
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (e) {
      console.error('保存设置失败', e);
    }
  }, []);

  const addAIProvider = useCallback((cfg: AIProviderConfig) => {
    setSettings(prev => {
      const list = [...prev.aiProviders, cfg];
      localStorage.setItem('aiProviders', JSON.stringify(list));
      return { ...prev, aiProviders: list };
    });
  }, []);

  const updateAIProvider = useCallback((cfg: AIProviderConfig) => {
    setSettings(prev => {
      const list = prev.aiProviders.map(c => c.id === cfg.id ? cfg : c);
      localStorage.setItem('aiProviders', JSON.stringify(list));
      return { ...prev, aiProviders: list };
    });
  }, []);

  const removeAIProvider = useCallback((id: string) => {
    setSettings(prev => {
      const list = prev.aiProviders.filter(c => c.id !== id);
      localStorage.setItem('aiProviders', JSON.stringify(list));
      return {
        ...prev,
        aiProviders: list,
        aiActiveProviderId: prev.aiActiveProviderId === id ? (list[0]?.id || '') : prev.aiActiveProviderId
      };
    });
  }, []);

  const setActiveAIProvider = useCallback((id: string) => {
    localStorage.setItem('aiActiveProviderId', id);
    setSettings(prev => ({ ...prev, aiActiveProviderId: id }));
  }, []);

  const exportData = useCallback(async () => {
    const cards = await db.cards.toArray();
    const reviews = await db.reviews.toArray();
    const data = { cards, reviews, exportDate: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcard_backup_${new Date().toLocaleDateString('zh-CN')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback(async (file: File): Promise<number> => {
    const text = await file.text();
    const data = JSON.parse(text) as any;
    if (data.cards) {
      await db.cards.clear();
      await db.cards.bulkAdd(data.cards);
    }
    if (data.reviews) {
      await db.reviews.clear();
      await db.reviews.bulkAdd(data.reviews);
    }
    return data.cards?.length ?? 0;
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    settings, loaded, save,
    addAIProvider, updateAIProvider, removeAIProvider, setActiveAIProvider,
    exportData, importData
  };
}
