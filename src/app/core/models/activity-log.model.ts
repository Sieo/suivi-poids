export interface ActivityLog {
  id: string;
  profileId: string;
  activityType: string;
  startedAt: string;
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
  notes: string | null;
}
