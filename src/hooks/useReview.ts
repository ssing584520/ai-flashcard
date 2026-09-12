import { useState, useCallback } from 'react';
import { calculateNextReview } from '../services/srs';
import { db } from '../services/db';
import type { ReviewRating } from '../types';

const FLIP_DURATION = 600;

export function useReview() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCards, setSessionCards] = useState<any[]>([]);
  const [sessionDone, setSessionDone] = useState(false);

  const startSession = useCallback((cards: any[]) => {
    setSessionCards(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionDone(false);
  }, []);

  const flip = useCallback(() => setIsFlipped(prev => !prev), []);

  const rate = useCallback(async (rating: ReviewRating, schedules: number[]) => {
    const card = sessionCards[currentIndex];
    if (!card) return;

    const existing = await db.reviews.where('cardId').equals(card.id).first();
    const easeFactor = existing?.easeFactor ?? 2.5;
    const interval = existing?.interval ?? 0;

    const result = calculateNextReview(rating, interval, easeFactor, schedules);

    await db.reviews.add({
      id: crypto.randomUUID(),
      cardId: card.id,
      rating,
      interval: result.interval,
      easeFactor: result.easeFactor,
      reviewCount: (existing?.reviewCount ?? 0) + 1,
      nextReview: result.nextReview,
      lastReview: Date.now(),
      createdAt: Date.now()
    });

    await db.cards.update(card.id, {
      updatedAt: Date.now(),
      difficulty: result.easeFactor
    });

    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < sessionCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setSessionDone(true);
      }
    }, FLIP_DURATION);
  }, [currentIndex, sessionCards]);

  const progress = sessionCards.length > 0 ? ((currentIndex + 1) / sessionCards.length) * 100 : 0;

  return {
    currentIndex,
    isFlipped,
    sessionCards,
    sessionDone,
    startSession,
    flip,
    rate,
    progress
  };
}
