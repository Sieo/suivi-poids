export interface Recipe {
  id: string;
  profileId: string | null;
  name: string;
  description: string;
  instructions: string | null;
  baseServings: number;
  preparationMinutes: number | null;
}
