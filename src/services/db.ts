import Dexie, { type EntityTable } from 'dexie';
import type { FlashCard, ReviewLog, Category } from '../types';

export class FlashCardDB extends Dexie {
  cards!: EntityTable<FlashCard, 'id'>;
  reviews!: EntityTable<ReviewLog, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  settings!: EntityTable<{ key: string; value: any }, 'key'>;

  constructor() {
    super('FlashCardDB');
    this.version(1).stores({
      cards: 'id, type, category, tags, difficulty, createdAt, updatedAt, source',
      reviews: 'id, cardId, nextReview, lastReview, createdAt',
      categories: 'id, name, color, icon',
      settings: '&key, value'
    });
  }
}

export const db = new FlashCardDB();
