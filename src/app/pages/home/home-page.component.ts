import { DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WorkbookDataService } from '../../core/services/workbook-data.service';

const todayIsoDate = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const isoWeekNumber = (date: Date): number => {
  const weekDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - (weekDate.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((weekDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
};

@Component({
  imports: [DatePipe, DecimalPipe, RouterLink, UpperCasePipe],
  selector: 'app-home-page',
  styleUrl: './home-page.component.scss',
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  protected readonly workbook = inject(WorkbookDataService);
  private readonly auth = inject(AuthService);
  protected readonly today = new Date();
  protected readonly weekNumber = isoWeekNumber(this.today);
  protected readonly displayName = computed(() => {
    const user = this.auth.user();
    const fullName = user?.user_metadata?.['full_name'];
    if (typeof fullName === 'string' && fullName.trim()) {
      return fullName.trim().split(/\s+/)[0];
    }

    return user?.email?.split('@')[0] || 'vous';
  });
  protected readonly todayPlan = computed(() => {
    const date = todayIsoDate();
    return this.workbook.data().mealPlans.find((plan) => plan.plannedOn === date) ?? null;
  });
  protected readonly todayLog = computed(() => {
    const date = todayIsoDate();
    return this.workbook.data().dailyLogs.find((log) => log.loggedOn === date) ?? null;
  });
  protected readonly latestWeight = computed(() => {
    const logs = this.workbook
      .data()
      .dailyLogs.filter((log) => log.weightKg !== null && Number.isFinite(log.weightKg))
      .sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));
    return logs.at(-1)?.weightKg ?? null;
  });
  protected readonly weightChange = computed(() => {
    const logs = this.workbook
      .data()
      .dailyLogs.filter((log) => log.weightKg !== null && Number.isFinite(log.weightKg))
      .sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));
    if (logs.length < 2) {
      return null;
    }

    return logs.at(-1)!.weightKg! - logs[0].weightKg!;
  });
  protected readonly absoluteWeightChange = computed(() => {
    const change = this.weightChange();
    return change === null ? null : Math.abs(change);
  });
  protected readonly weightSparkline = computed(() => {
    const weights = this.workbook
      .data()
      .dailyLogs.filter((log) => log.weightKg !== null && Number.isFinite(log.weightKg))
      .sort((a, b) => a.loggedOn.localeCompare(b.loggedOn))
      .map((log) => log.weightKg!);
    if (weights.length < 2) {
      return '';
    }

    const minimum = Math.min(...weights);
    const range = Math.max(...weights) - minimum || 1;
    return weights
      .map(
        (weight, index) =>
          `${(index / (weights.length - 1)) * 100},${31 - ((weight - minimum) / range) * 24}`,
      )
      .join(' ');
  });
  protected readonly periods = [
    { key: 'breakfast', label: 'Petit-déjeuner', time: '08:00' },
    { key: 'lunch', label: 'Déjeuner', time: '12:30' },
    { key: 'dinner', label: 'Dîner', time: '19:30' },
  ] as const;
  protected readonly waterGlassMarkers = Array.from({ length: 8 });
  protected readonly mealAdherence = computed(() => {
    const meals = this.workbook.data().mealPlans.flatMap((plan) => [
      plan.breakfast,
      plan.lunch,
      plan.dinner,
    ]);
    const recordedMeals = meals.filter((meal) => meal.status !== 'planned');
    return recordedMeals.length
      ? Math.round(
          (recordedMeals.filter((meal) => meal.status === 'respected').length /
            recordedMeals.length) *
            100,
        )
      : null;
  });
}
