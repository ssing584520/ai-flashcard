export interface DictEntry {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: MeaningItem[];
  source: 'free-dict' | 'cambridge' | 'ai';
}

export interface MeaningItem {
  word: string;
  partOfSpeech: string;
  definitions: DefinitionItem[];
}

export interface DefinitionItem {
  definition: string;
  example?: string;
}

const FREE_DICT_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const CAMBRIDGE_URL = 'https://dictionary.cambridge.org/dictionary/english/';

const POS_MAP: Record<string, string> = {
  noun: '名词',
  verb: '动词',
  'phrasal verb': '动词短语',
  adjective: '形容词',
  adverb: '副词',
  pronoun: '代词',
  preposition: '介词',
  conjunction: '连词',
  interjection: '感叹词',
  article: '冠词',
  numeral: '数词',
  determiner: '限定词',
  exclamation: '感叹词',
  n: '名词',
  v: '动词',
  vt: '及物动词',
  vi: '不及物动词',
  adj: '形容词',
  adv: '副词',
  pron: '代词',
  prep: '介词',
  conj: '连词',
  int: '感叹词',
  art: '冠词',
  num: '数词',
  det: '限定词',
  phr: '短语',
  pl: '复数',
  'noun phrase': '名词短语',
  'verb phrase': '动词短语',
  'adjective phrase': '形容词短语'
};

export function cnPartOfSpeech(pos: string): string {
  const key = pos.trim().toLowerCase().replace(/\.+$/, '');
  const singular = key.replace(/s$/, '');
  return POS_MAP[key] || POS_MAP[singular] || pos;
}

function getProxyUrl(): string {
  try {
    return localStorage.getItem('cambridgeProxyUrl') || '';
  } catch { return ''; }
}

export async function searchWord(word: string): Promise<DictEntry | null> {
  const normalized = word.trim().toLowerCase();
  if (!normalized) return null;

  const timeout = 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${FREE_DICT_URL}${encodeURIComponent(normalized)}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    if (res.ok) {
      const data = await res.json() as any[];
      if (data.length > 0) {
        return convertFreeDictEntries(data, normalized);
      }
    }
  } catch (e) {
    console.warn('Free Dictionary API error:', e);
  }

  const proxy = getProxyUrl();
  if (proxy) {
    try {
      const res = await fetch(`${proxy}${encodeURIComponent(CAMBRIDGE_URL + normalized)}`, { signal: controller.signal });
      if (res.ok) {
        const text = await res.text();
        const entry = parseCambridgeHTML(text, normalized);
        if (entry) return entry;
      }
    } catch (e) {
      console.warn('Cambridge proxy error:', e);
    }
  }

  clearTimeout(timer);
  return null;
}

function convertFreeDictEntries(data: any[], baseWord: string): DictEntry {
  const phonetics: { text?: string; audio?: string }[] = [];
  const meanings: MeaningItem[] = [];
  let phonetic = '';

  for (const entry of data) {
    if (!phonetic) {
      phonetic = entry.phonetic || '';
      if (!phonetic && (entry.phonetics || []).some((p: any) => p.text)) {
        phonetic = entry.phonetics.find((p: any) => p.text)?.text || '';
      }
    }
    (entry.phonetics || []).forEach((p: any) => {
      const item = { text: p.text || undefined, audio: p.audio || undefined };
      if (item.text || item.audio) phonetics.push(item);
    });
    const w: string = typeof entry.word === 'string' && entry.word ? entry.word : baseWord;
    (entry.meanings || []).forEach((m: any) => {
      meanings.push({
        word: w,
        partOfSpeech: cnPartOfSpeech(m.partOfSpeech || ''),
        definitions: (m.definitions || []).map((d: any) => ({
          definition: d.definition || '',
          example: d.example || undefined
        }))
      });
    });
  }

  return { word: baseWord, phonetic, phonetics, meanings, source: 'free-dict' };
}

function parseCambridgeHTML(html: string, word: string): DictEntry | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const phonetics: { text?: string; audio?: string }[] = [];
    doc.querySelectorAll('[class*="pron"]').forEach((el: Element) => {
      const text = el.textContent?.trim();
      if (text && text.startsWith('/')) phonetics.push({ text });
    });
    doc.querySelectorAll('source').forEach((el: Element) => {
      const src = el.getAttribute('src');
      if (src) phonetics.push({ audio: src });
    });

    const meanings: MeaningItem[] = [];
    doc.querySelectorAll('[class*="def-block"]').forEach((block: Element) => {
      const pos = block.querySelector('[class*="pos"]')?.textContent?.trim();
      const defs: DefinitionItem[] = [];
      block.querySelectorAll('[class*="trans"]').forEach((d: Element) => {
        const def = d.textContent?.trim();
        if (def) defs.push({ definition: def });
      });
      if (pos && defs.length > 0) {
        meanings.push({ word, partOfSpeech: cnPartOfSpeech(pos || ''), definitions: defs });
      }
    });

    if (meanings.length === 0 && phonetics.length === 0) return null;

    return { word, phonetic: phonetics[0]?.text || '', phonetics, meanings, source: 'cambridge' };
  } catch {
    return null;
  }
}
