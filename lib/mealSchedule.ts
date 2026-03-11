import type { MealPeriod } from "./types";
import { formatDateISO } from "./date";

interface TimeRange {
  start: number; // minutes since midnight
  end: number;
}

const HIDDEN_MEALS = new Set(["Brunch"]);

// Minutes since midnight helper
function hm(h: number, m: number) {
  return h * 60 + m;
}

// Schedule keyed by JS getDay() (0=Sun, 1=Mon, …, 6=Sat)
const SCHEDULE: Record<string, Record<number, TimeRange>> = {
  Breakfast: {
    1: { start: hm(7, 45), end: hm(10, 30) },
    2: { start: hm(7, 45), end: hm(10, 30) },
    3: { start: hm(7, 45), end: hm(10, 30) },
    4: { start: hm(7, 45), end: hm(10, 30) },
    5: { start: hm(7, 45), end: hm(10, 30) },
    6: { start: hm(9, 0), end: hm(10, 30) },
  },
  Lunch: {
    0: { start: hm(12, 0), end: hm(15, 0) },
    1: { start: hm(11, 0), end: hm(15, 0) },
    2: { start: hm(11, 0), end: hm(15, 0) },
    3: { start: hm(11, 0), end: hm(15, 0) },
    4: { start: hm(11, 0), end: hm(15, 0) },
    5: { start: hm(11, 0), end: hm(15, 0) },
    6: { start: hm(11, 0), end: hm(15, 0) },
  },
  Dinner: {
    0: { start: hm(16, 0), end: hm(20, 0) },
    1: { start: hm(16, 0), end: hm(21, 0) },
    2: { start: hm(16, 0), end: hm(21, 0) },
    3: { start: hm(16, 0), end: hm(21, 0) },
    4: { start: hm(16, 0), end: hm(21, 0) },
    5: { start: hm(16, 0), end: hm(21, 0) },
    6: { start: hm(16, 0), end: hm(20, 0) },
  },
};

export interface AutoMealSelection {
  date: string;
  mealId: number;
}

/**
 * Returns the best date + meal period to show right now.
 *
 * - During a meal → that meal, today
 * - Between meals → next upcoming meal, today
 * - After all meals end for the day → Breakfast, tomorrow
 */
export function getAutoMealSelection(periods: MealPeriod[]): AutoMealSelection | null {
  if (periods.length === 0) return null;

  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();

  const periodByName = new Map(periods.map((p) => [p.name, p.id]));
  const today = formatDateISO(now);

  const todayMeals: { name: string; id: number; start: number; end: number }[] = [];
  for (const mealName of ["Breakfast", "Lunch", "Dinner"]) {
    const range = SCHEDULE[mealName]?.[day];
    const id = periodByName.get(mealName);
    if (range && id !== undefined) {
      todayMeals.push({ name: mealName, id, start: range.start, end: range.end });
    }
  }
  todayMeals.sort((a, b) => a.start - b.start);

  // Currently serving?
  for (const meal of todayMeals) {
    if (mins >= meal.start && mins < meal.end) {
      return { date: today, mealId: meal.id };
    }
  }

  // Between meals? Next upcoming one today.
  for (const meal of todayMeals) {
    if (mins < meal.start) {
      return { date: today, mealId: meal.id };
    }
  }

  // All meals over → show tomorrow's breakfast
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = formatDateISO(tomorrow);
  const tomorrowDay = tomorrow.getDay();

  const breakfastRange = SCHEDULE["Breakfast"]?.[tomorrowDay];
  const breakfastId = periodByName.get("Breakfast");
  if (breakfastRange && breakfastId !== undefined) {
    return { date: tomorrowISO, mealId: breakfastId };
  }

  // Tomorrow has no breakfast (e.g. Sunday) → fall back to first available meal tomorrow
  for (const mealName of ["Lunch", "Dinner"]) {
    const range = SCHEDULE[mealName]?.[tomorrowDay];
    const id = periodByName.get(mealName);
    if (range && id !== undefined) {
      return { date: tomorrowISO, mealId: id };
    }
  }

  return { date: today, mealId: periods[0].id };
}

/** Filter out meals we don't want to show (e.g. Brunch). */
export function filterMealPeriods(periods: MealPeriod[]): MealPeriod[] {
  return periods.filter((p) => !HIDDEN_MEALS.has(p.name));
}
