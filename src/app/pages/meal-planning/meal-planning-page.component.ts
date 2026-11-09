import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MealPlan, MealStatus } from '../../core/models';
import { WorkbookDataService } from '../../core/services/workbook-data.service';
import { MealPlanningHeroComponent } from './components/meal-planning-hero/meal-planning-hero.component';

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

@Component({
  imports: [DatePipe, MealPlanningHeroComponent],
  selector: 'app-meal-planning-page',
  styleUrl: './meal-planning-page.component.scss',
  templateUrl: './meal-planning-page.component.html',
})
export class MealPlanningPageComponent {
  protected readonly workbook = inject(WorkbookDataService);
  protected readonly selectedDate = signal(toIsoDate(new Date()));
  protected readonly plans = computed(() => {
    const week = this.workbook.data().week;
    return this.workbook
      .data()
      .mealPlans.filter((plan) => plan.plannedOn >= week.startsOn && plan.plannedOn <= week.endsOn)
      .sort((a, b) => a.plannedOn.localeCompare(b.plannedOn));
  });
  protected readonly selectedPlan = computed(
    () => this.plans().find((plan) => plan.plannedOn === this.selectedDate()) ?? null,
  );
  protected readonly periodLabels = [
    { key: 'breakfast', label: 'Petit-déjeuner', icon: '☀', time: 'Matin' },
    { key: 'lunch', label: 'Déjeuner', icon: '◉', time: 'Midi' },
    { key: 'dinner', label: 'Dîner', icon: '☾', time: 'Soir' },
  ] as const;
  protected readonly weekRange = computed(() => {
    const week = this.workbook.data().week;
    const dateFormat = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
    });

    return `${dateFormat.format(new Date(`${week.startsOn}T00:00:00`))} – ${dateFormat.format(new Date(`${week.endsOn}T00:00:00`))}`;
  });
  protected readonly followedCount = computed(() =>
    this.plans().reduce(
      (count, plan) =>
        count +
        this.periodLabels.filter((period) => plan[period.key].status === 'respected').length,
      0,
    ),
  );
  protected readonly pendingCount = computed(() =>
    this.plans().reduce(
      (count, plan) =>
        count + this.periodLabels.filter((period) => plan[period.key].status === 'planned').length,
      0,
    ),
  );

  protected setStatus(
    plan: MealPlan,
    period: (typeof this.periodLabels)[number]['key'],
    event: Event,
  ): void {
    const status = (event.target as HTMLSelectElement).value as MealStatus;
    this.workbook.updateMealStatus(plan.id, period, status);
  }

  protected updateNote(plan: MealPlan, event: Event): void {
    this.workbook.updateMealNote(plan.id, (event.target as HTMLTextAreaElement).value);
  }

  protected mealStatus(plan: MealPlan, period: string): MealStatus {
    return plan[period as 'breakfast' | 'lunch' | 'dinner'].status;
  }

  protected readonly trackPlan = (_: number, plan: MealPlan) => plan.id;
}
