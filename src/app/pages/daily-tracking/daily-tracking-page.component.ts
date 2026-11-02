import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DailyLog } from '../../core/models';
import { WorkbookDataService } from '../../core/services/workbook-data.service';

type NumericField = 'weightKg' | 'hungerLevel' | 'waterGlasses' | 'sleepHours';
type TextField = 'activity' | 'mealsFollowed' | 'notes';

@Component({
  imports: [DatePipe],
  selector: 'app-daily-tracking-page',
  styleUrl: './daily-tracking-page.component.scss',
  templateUrl: './daily-tracking-page.component.html',
})
export class DailyTrackingPageComponent {
  protected readonly workbook = inject(WorkbookDataService);

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
