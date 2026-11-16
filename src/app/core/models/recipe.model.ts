import type { MealPeriod } from './meal-plan.model';

export interface Recipe {
  id: string;
  profileId: string | null;
  name: string;
  description: string;
  instructions: string | null;
  ingredients: string;
  baseServings: number;
  preparationMinutes: number | null;
  plannedOn: string;
  mealPeriod: MealPeriod;
  imageUrl: string | null;
}
