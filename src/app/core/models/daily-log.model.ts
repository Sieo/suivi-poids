export interface DailyLog {
  id: string;
  profileId: string;
  loggedOn: string;
  weightKg: number | null;
  hungerLevel: number | null;
  waterGlasses: number | null;
  activity: string;
  mealsFollowed: string;
  snacksConsumed: string;
  emotionalHunger: boolean | null;
  sleepHours: number | null;
  notes: string | null;
}
