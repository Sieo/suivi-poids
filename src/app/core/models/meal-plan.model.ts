export type MealStatus = 'planned' | 'respected' | 'not-respected' | 'replaced';

export interface PlannedMeal {
  description: string;
  status: MealStatus;
  recipeId?: string | null;
}

export interface MealPlan {
  id: string;
  weekId: string;
  plannedOn: string;
  dayLabel: string;
  breakfast: PlannedMeal;
  lunch: PlannedMeal;
  dinner: PlannedMeal;
  snacks: string;
  estimatedKcal: string;
  notes: string;
}
