import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import type { FlashCard, ReviewLog } from '../types';

export function useCards() {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [reviews, setReviews] = useState<ReviewLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, r] = await Promise.all([db.cards.toArray(), db.reviews.toArray()]);
    setCards(c);
    setReviews(r);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addCard = useCallback(async (card: Omit<FlashCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newCard: FlashCard = { ...card, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await db.cards.add(newCard);
    await load();
    return newCard;
  }, [load]);

  const updateCard = useCallback(async (card: FlashCard) => {
    await db.cards.update(card.id, { ...card, updatedAt: Date.now() });
    await load();
  }, [load]);

  const deleteCard = useCallback(async (id: string) => {
    await db.cards.delete(id);
    await db.reviews.where('cardId').equals(id).delete();
    await load();
  }, [load]);

  const getDueCards = useCallback(async () => {
    const all = await db.cards.toArray();
    const now = Date.now();
    return all.filter(c => {
      const review = reviews.find(r => r.cardId === c.id);
      return !review || review.nextReview <= now;
    });
  }, [reviews]);

  const addReview = useCallback(async (review: Omit<ReviewLog, 'id' | 'createdAt'>) => {
    const now = Date.now();
    const newReview: ReviewLog = { ...review, id: crypto.randomUUID(), createdAt: now };
    await db.reviews.add(newReview);
    await load();
    return newReview;
  }, [load]);

  const getTodayStats = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const todayReviews = reviews.filter(r => r.createdAt >= todayMs);
    const correct = todayReviews.filter(r => r.rating === 'good' || r.rating === 'easy').length;
    const total = todayReviews.length;
    return { total, correct, streak: calculateStreak(reviews) };
  }, [reviews]);

  return {
    cards,
    reviews,
    loading,
    addCard,
    updateCard,
    deleteCard,
    getDueCards,
    addReview,
    getTodayStats,
    reload: load
  };
}

function calculateStreak(reviews: ReviewLog[]): number {
  if (reviews.length === 0) return 0;
  const sorted = [...reviews].sort((a, b) => b.createdAt - a.createdAt);
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dayMs = checkDate.getTime();
    const nextDayMs = new Date(checkDate.getTime() - 86400000).getTime();
    const dayReviews = sorted.filter(r => r.createdAt >= nextDayMs && r.createdAt < dayMs);
    if (dayReviews.length > 0) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else if (i === 0) {
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}
