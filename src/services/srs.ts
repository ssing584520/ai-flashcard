import type { ReviewRating } from '../types';

const DEFAULT_SCHEDULES = [1, 2, 4, 7, 15, 30, 60, 90];

export interface SRSResult {
  nextReview: number;
  interval: number;
  easeFactor: number;
}

export function extendSchedules(list: number[]): number[] {
  const out = [...new Set(list)];
  const max = Math.max(...out);
  if (!out.includes(60) && max <= 30) out.push(60);
  if (!out.includes(90) && max <= 60) out.push(90);
  return out.sort((a, b) => a - b);
}

export function getSchedules(): number[] {
  try {
    const raw = localStorage.getItem('schedules');
    if (raw) {
      const parsed = JSON.parse(raw) as number[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        let list = parsed;
        if (parsed.some(v => v >= 120)) {
          list = [...new Set(parsed.map(v => Math.max(1, Math.round(v / 1440))))];
        }
        return extendSchedules(list);
      }
    }
  } catch {}
  return DEFAULT_SCHEDULES;
}

export function calculateNextReview(
  rating: ReviewRating,
  currentInterval: number,
  easeFactor: number,
  schedules: number[] = DEFAULT_SCHEDULES
): SRSResult {
  const now = Date.now();

  let newInterval: number;
  let newEase = easeFactor;

  switch (rating) {
    case 'forget':
    case 'hard':
      newInterval = schedules[0];
      newEase = Math.max(1.3, easeFactor - (rating === 'forget' ? 0.2 : 0.15));
      break;
    case 'good': {
      const next = schedules.find(s => s > currentInterval);
      newInterval = next ?? (schedules[schedules.length - 1] ?? currentInterval * 2);
      newEase = easeFactor + 0.05;
      break;
    }
    case 'easy':
      newInterval = currentInterval * 2.5;
      newEase = easeFactor + 0.15;
      break;
    default:
      newInterval = currentInterval;
  }

  newInterval = Math.max(1, Math.round(newInterval));
  newEase = Math.max(1.3, Math.min(2.5, newEase));

  return {
    nextReview: now + newInterval * 24 * 60 * 60 * 1000,
    interval: newInterval,
    easeFactor: newEase
  };
}

export function getDueCards(
  cards: { id: string; nextReview?: number }[],
  now: number = Date.now()
): { id: string; nextReview?: number }[] {
  return cards.filter(c => !c.nextReview || c.nextReview <= now);
}

export function getTodayStats(reviews: { rating: ReviewRating; createdAt: number }[]): {
  total: number;
  correct: number;
  streak: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const todayReviews = reviews.filter(r => r.createdAt >= todayMs);
  const correct = todayReviews.filter(r => r.rating === 'good' || r.rating === 'easy').length;

  return {
    total: todayReviews.length,
    correct,
    streak: calculateStreak(reviews)
  };
}

function calculateStreak(reviews: { rating: ReviewRating; createdAt: number }[]): number {
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
