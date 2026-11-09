import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { DailyLog, MealPlan, MealStatus } from '../../core/models';
import { WorkbookDataService } from '../../core/services/workbook-data.service';

type NumericField = 'weightKg' | 'hungerLevel' | 'waterGlasses' | 'sleepHours';
type TextField = 'activity' | 'mealsFollowed' | 'notes';

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

@Component({
  imports: [DatePipe],
  selector: 'app-daily-tracking-page',
  styleUrl: './daily-tracking-page.component.scss',
  templateUrl: './daily-tracking-page.component.html',
})
export class DailyTrackingPageComponent implements OnInit {
  protected readonly workbook = inject(WorkbookDataService);

  ngOnInit(): void {
    this.workbook.ensureDailyLog(toIsoDate(new Date()));
  }

  protected mealPlanFor(log: DailyLog): MealPlan | undefined {
    return this.workbook.data().mealPlans.find((plan) => plan.plannedOn === log.loggedOn);
  }

  protected mealStatusLabel(status: MealStatus): string {
    return {
      planned: 'À renseigner',
      respected: 'Respecté',
      'not-respected': 'Non respecté',
      replaced: 'Remplacé',
    }[status];
  }

  protected updateNumber(log: DailyLog, field: NumericField, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? null : Number(raw);
    if (value !== null && !Number.isFinite(value)) {
      return;
    }

    this.workbook.updateDailyLog(log.id, { [field]: value });
  }

  protected updateText(log: DailyLog, field: TextField, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.workbook.updateDailyLog(log.id, {
      [field]: target.value,
    });
  }

  protected updateEmotionalHunger(log: DailyLog, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.workbook.updateDailyLog(log.id, {
      emotionalHunger: value === '' ? null : value === 'true',
    });
  }
}
