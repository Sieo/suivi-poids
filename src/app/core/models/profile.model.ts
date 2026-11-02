export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  startDate: string | null;
  goalWeightKg: number | null;
  preferredWeightUnit: 'kg' | 'lb';
  createdAt: string;
  updatedAt: string;
}
