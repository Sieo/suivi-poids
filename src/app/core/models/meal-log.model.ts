export interface MealLog {
  id: string;
  mealPlanId: string;
  recipeId: string;
  consumedAt: string;
  servings: number;
  notes: string | null;
}
