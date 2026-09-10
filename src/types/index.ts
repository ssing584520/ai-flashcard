export type CardType = 'english' | 'chinese' | 'mistake' | 'custom';
export type ReviewRating = 'forget' | 'hard' | 'good' | 'easy';
export type Subject = '数学' | '语文' | '英语' | '科学' | '其他';
export type CardColor = 'pink' | 'blue' | 'yellow' | 'mint' | 'lavender' | 'peach';

export interface FlashCard {
  id: string;
  type: CardType;
  front: string;
  back: string;
  metadata: CardMetadata;
  category: string;
  tags: string[];
  difficulty: number;
  createdAt: number;
  updatedAt: number;
  source: 'manual' | 'api' | 'ai';
  color: CardColor;
}

export interface CardMetadata {
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: MeaningItem[];
  wordFamily?: string[];
  examples?: string[];
  pinyin?: string;
  imageUrl?: string;
  subject?: Subject;
  analysis?: string;
  mnemonic?: string;
}

export interface MeaningItem {
  word?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: ReviewRating;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  nextReview: number;
  lastReview: number;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface AppSettings {
  openrouterApiKey: string;
  eudicApiKey: string;
  cambridgeProxyUrl: string;
  schedules: number[];
  theme: 'light' | 'dark';
  dailyGoal: number;
}
