interface AIResponse {
  word?: string;
  phonetic?: string;
  meanings?: AIMeaning[];
  examples?: string[];
  example?: string;
  mnemonic?: string;
  pinyin?: string;
  analysis?: string;
  answer?: string;
  question?: string;
}

interface AIMeaning {
  word?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
}

export type AIProviderId = 'openrouter' | 'deepseek' | 'openai' | 'glm' | 'moonshot' | 'qwen' | 'custom';

export interface AIProvider {
  id: AIProviderId;
  name: string;
  baseUrl: string;
  defaultModel: string;
  visionModel?: string;
  keyHint: string;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  builtin?: AIProviderId;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openrouter/free',
    keyHint: 'https://openrouter.ai/keys'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
    keyHint: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    visionModel: 'gpt-4o-mini',
    keyHint: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    visionModel: 'glm-4v-flash',
    keyHint: 'https://open.bigmodel.cn/usercenter/apikeys'
  },
  {
    id: 'moonshot',
    name: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'moonshot-v1-8k',
    keyHint: 'https://platform.moonshot.cn/console/api-keys'
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-turbo',
    visionModel: 'qwen-vl-plus',
    keyHint: 'https://bailian.console.aliyun.com'
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    defaultModel: '',
    keyHint: '任意兼容 OpenAI 格式的服务'
  }
];

export function createProviderFromPreset(preset: AIProvider): AIProviderConfig {
  return {
    id: crypto.randomUUID(),
    name: preset.name,
    baseUrl: preset.baseUrl,
    apiKey: '',
    model: preset.defaultModel,
    visionModel: preset.visionModel,
    builtin: preset.id
  };
}

export async function testAIConnection(cfg: AIProviderConfig): Promise<string> {
  try {
    const text = await askAI('请只回复两个字：正常。不要其他任何内容', undefined, undefined, cfg);
    return `✅ 连接成功 - ${text.slice(0, 50)}`;
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return '❌ 无法访问（多半是 CORS 拦截或地址不通），请求: 地址 ' + cfg.baseUrl;
    }
    return `❌ ${msg.split(' ')
      .filter((w: string) => !w.startsWith('"') && w.includes('http'))
      .join(' ') || '测试失败'}`;
  }
}

function toChatCompletionsUrl(baseUrl: string): string {
  const url = baseUrl.trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  if (/\/v\d+$/.test(url)) return url + '/chat/completions';
  return url + '/v1/chat/completions';
}

export async function askAI(
  prompt: string,
  imageUrl: string | undefined,
  systemPrompt: string | undefined,
  cfg: AIProviderConfig
): Promise<string> {
  return (await askAIMeta(prompt, imageUrl, systemPrompt, cfg)).text;
}

async function askAIMeta(
  prompt: string,
  imageUrl: string | undefined,
  systemPrompt: string | undefined,
  cfg: AIProviderConfig
): Promise<{ text: string; truncated: boolean }> {
  if (!cfg.apiKey) throw new Error(`"${cfg.name}" 未配置 API Key，请到设置页补全`);
  if (!cfg.baseUrl) throw new Error(`"${cfg.name}" 未配置 API 地址`);

  const model = imageUrl ? (cfg.visionModel || cfg.model) : cfg.model;

  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

  if (imageUrl) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json'
  };
  if (cfg.builtin === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'AI-Flashcards';
  }

  const res = await fetch(toChatCompletionsUrl(cfg.baseUrl), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`AI请求失败(${res.status}): 地址 ${cfg.baseUrl} · 模型 ${model}${cfg.apiKey ? '' : ' · Key 为空'} ${JSON.stringify(err)}`);
  }

  const data = await res.json() as any;
  const text = (data?.choices?.[0]?.message?.content || '').trim();
  const finish = data?.choices?.[0]?.finish_reason as string | undefined;
  const truncated = finish === 'length'
    || /[….]{3,}$/.test(text)
    || /\{\s*$/.test(text)
    || /"word"\s*:\s*"[^"]*"?$/.test(text);
  return { text, truncated };
}

const WORD_SYSTEM_PROMPT = `你是一个专业的英语学习助手。请根据用户提供的英语单词，生成结构化的学习卡片数据。

返回格式必须为 JSON：
{
  "word": "单词",
  "phonetic": "音标",
  "meanings": [
    { "word": "本义所属词汇（主词填本词；若是派生词填该派生词）", "partOfSpeech": "词性（用中文：名词/动词/形容词/副词等）", "definition": "中文释义", "example": "含该词的地道例句（仅主词需要）" }
  ],
  "wordFamily": ["词族/派生词清单"],
  "mnemonic": "记忆技巧（如有）"
}

要求：
1. 主词给 2-3 条释义并各配一条不超过 10 个英文单词的短例句。
2. 派生词（wordFamily 里除主词外）每个只给 1 条精简条目：word + partOfSpeech + definition，**不写 example**，挑最重要的一条释义即可。
3. "wordFamily" 包含主词，最多不超过 4 个派生词。
4. 必须输出完整、合法的 JSON，禁止用省略号（... 或 …）截断内容。
5. 整体输出宁短勿缺：内容太多时可把主词释义压缩为 2 条，但字段必须全部输出完。`;

const PHRASE_SYSTEM_PROMPT = `你是一个专业的英语学习助手。请根据用户提供的英语短语，生成结构化的学习卡片数据。

返回格式必须为 JSON：
{
  "word": "短语",
  "phonetic": "音标",
  "meanings": [
    { "definition": "中文释义", "example": "含该短语的地道英文例句" }
  ]
}

要求：
1. "meanings" 给 2-3 条释义并各配一条不超过 10 个英文单词的短例句。
2. **不要提供词性、不要提供派生词/词族**，只输出短语本身的释义和例句。
3. 必须输出完整、合法的 JSON，禁止用省略号（... 或 …）截断内容。`;

const CHINESE_SYSTEM_PROMPT = `你是一个中文语文助手。请根据用户提供的中文词语，生成简洁的中文学习卡片。

返回格式必须为 JSON：
{
  "word": "词语",
  "pinyin": "拼音（带声调）",
  "examples": ["包含该词语的例句", "再给一条不同用法的例句"]
}

要求：
1. 只输出以上三个字段，不要给出释义、词性、近反义词等。
2. "examples" 固定给 2 条自然、短小的中文例句。`;

const MISTAKE_SYSTEM_PROMPT = `你是一个专业的辅导老师。请分析用户发送的错题图片，提取题目内容，给出正确答案和详细解析。

返回格式必须为 JSON：
{
  "question": "题目内容（文字描述）",
  "answer": "正确答案",
  "analysis": "详细解析过程"
}`;

export async function generateWordCard(word: string, cfg: AIProviderConfig): Promise<AIResponse> {
  const isPhrase = /\s/.test(word.trim());
  const systemPrompt = isPhrase ? PHRASE_SYSTEM_PROMPT : WORD_SYSTEM_PROMPT;
  const attempts: string[] = [];

  const first = await askAIMeta(`请为英语单词"${word}"生成学习卡片数据`, undefined, systemPrompt, cfg);
  attempts.push(first.text);
  let parsed = parseAIJSON(first.text);

  if (!hasValidCardContent(parsed) || first.truncated) {
    const second = await askAIMeta(
      `请重新为英语单词"${word}"生成学习卡片数据，务必输出短小、完整、不截断的 JSON。`,
      undefined,
      systemPrompt + '\n要求：上次输出不完整，本次必须逐字段完整输出，宁短勿缺。',
      cfg
    );
    attempts.push(second.text);
    parsed = parseAIJSON(second.text);

    if (!hasValidCardContent(parsed) || second.truncated) {
      const best = second.text.length > first.text.length ? second.text : first.text;
      const third = await askAIMeta(
        `这是一段因字数限制被截断的 JSON，请把补全后的完整合法 JSON 原样输出：\n${best.slice(0, 3000)}`,
        undefined,
        '你是 JSON 修复助手。只输出补全后的完整 JSON，不要任何解释、不要省略号。',
        cfg
      );
      attempts.push(third.text);
      parsed = parseAIJSON(third.text);
    }
  }

  if (!hasValidCardContent(parsed)) {
    const longest = attempts.reduce((a, b) => (b.length > a.length ? b : a), '');
    parsed = salvageBrokenWordJSON(longest);
  }
  if (!parsed.word) parsed.word = word;
  return parsed;
}

function hasValidCardContent(parsed: AIResponse): boolean {
  return !!parsed && typeof parsed.word === 'string' && !!parsed.word
    && Array.isArray(parsed.meanings) && parsed.meanings.length > 0;
}

function salvageBrokenWordJSON(text: string): AIResponse {
  const res: AIResponse = {};
  const word = text.match(/"word"\s*:\s*"([^"]+)"/);
  if (word) res.word = word[1];
  const phon = text.match(/"phonetic"\s*:\s*"([^"]+)"/);
  if (phon) res.phonetic = phon[1];

  const meanings: AIMeaning[] = [];
  const blockRe = /\{(?:[^{}]*\{[^{}]*\}[^{}]*|[^{}]*)\}/g;
  const blocks = text.match(blockRe) || [];
  for (const block of blocks) {
    const part = block.match(/"partOfSpeech"\s*:\s*"([^"]+)"/);
    const def = block.match(/"definition"\s*:\s*"([^"]+)"/);
    if (!part || !def) continue;
    if (def[1].includes('中文释义') || def[1].includes('本义所属词汇')) continue;
    const m: AIMeaning = { partOfSpeech: part[1], definition: def[1] };
    const w = block.match(/"word"\s*:\s*"([^"]+)"/);
    if (w) m.word = w[1];
    const ex = block.match(/"example"\s*:\s*"([^"]+)"/);
    if (ex) m.example = ex[1];
    meanings.push(m);
  }
  if (meanings.length) res.meanings = meanings;
  return res;
}

const CACHE_TTL = 30 * 60 * 1000;
const inFlight = new Map<string, Promise<unknown>>();
const doneCache = new Map<string, { value: unknown; at: number }>();

export function cachedCall<T>(cacheKey: string, factory: () => Promise<T>): Promise<T> {
  const done = doneCache.get(cacheKey);
  if (done && Date.now() - done.at < CACHE_TTL) return Promise.resolve(done.value as T);
  const running = inFlight.get(cacheKey);
  if (running) return running as Promise<T>;
  const p = factory();
  inFlight.set(cacheKey, p);
  p.then(v => {
    doneCache.set(cacheKey, { value: v, at: Date.now() });
    inFlight.delete(cacheKey);
  }).catch(() => inFlight.delete(cacheKey));
  return p;
}

export function waitCached<T>(cacheKey: string, factory: () => Promise<T>): Promise<T> | null {
  const running = inFlight.get(cacheKey);
  if (running) return running as Promise<T>;
  const done = doneCache.get(cacheKey);
  if (done && Date.now() - done.at < CACHE_TTL) return Promise.resolve(done.value as T);
  void factory;
  return null;
}

export async function generateChineseCard(word: string, cfg: AIProviderConfig): Promise<AIResponse> {
  const result = await askAI(
    `请为中文词语"${word}"生成学习卡片数据`,
    undefined,
    CHINESE_SYSTEM_PROMPT,
    cfg
  );
  return parseAIJSON(result);
}

export async function analyzeMistake(imageBase64: string, cfg: AIProviderConfig): Promise<AIResponse> {
  const result = await askAI(
    '请分析这道错题，给出题目内容、正确答案和详细解析',
    imageBase64,
    MISTAKE_SYSTEM_PROMPT,
    cfg
  );
  return parseAIJSON(result);
}

function parseAIJSON(text: string): AIResponse {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AIResponse;
    }
  } catch {}
  const short = cleaned.length > 500 ? cleaned.slice(0, 500) + '…' : cleaned;
  return { word: short.replace(/\n+/g, ' ').trim() };
}
