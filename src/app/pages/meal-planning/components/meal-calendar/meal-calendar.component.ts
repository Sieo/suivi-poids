import { Component, computed, input, output, signal } from '@angular/core';

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

interface CalendarDay {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  hasPlan: boolean;
}

@Component({
  selector: 'app-meal-calendar',
  styleUrl: './meal-calendar.component.scss',
  templateUrl: './meal-calendar.component.html',
})
export class MealCalendarComponent {
  readonly planDates = input.required<string[]>();
  readonly selectedDate = input.required<string>();
  readonly dateSelected = output<string>();
  protected readonly visibleMonth = signal(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  protected readonly weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  protected readonly monthLabel = computed(() => {
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      this.visibleMonth(),
    );
    return `${label.charAt(0).toLocaleUpperCase('fr-FR')}${label.slice(1)}`;
  });
  protected readonly days = computed(() => {
    const month = this.visibleMonth();
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (firstOfMonth.getDay() + 6) % 7;
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
    const today = toIsoDate(new Date());
    const planDates = new Set(this.planDates());

    return Array.from({ length: 42 }, (_, index): CalendarDay => {
      const date = new Date(
        firstDay.getFullYear(),
        firstDay.getMonth(),
        firstDay.getDate() + index,
      );
      const isoDate = toIsoDate(date);
      return {
        date: isoDate,
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        isToday: isoDate === today,
        hasPlan: planDates.has(isoDate),
      };
    });
  });

  protected changeMonth(offset: number): void {
    const currentMonth = this.visibleMonth();
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    this.visibleMonth.set(nextMonth);

    const selected = new Date(`${this.selectedDate()}T00:00:00`);
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    this.dateSelected.emit(
      toIsoDate(
        new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          Math.min(selected.getDate(), lastDay),
        ),
      ),
    );
  }

  protected selectDay(day: CalendarDay): void {
    this.dateSelected.emit(day.date);
    if (!day.inMonth) {
      const date = new Date(`${day.date}T00:00:00`);
      this.visibleMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  protected dayLabel(day: CalendarDay): string {
    const label = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${day.date}T00:00:00`));
    return [label, day.isToday ? 'aujourd’hui' : '', day.hasPlan ? 'repas planifiés' : '']
      .filter(Boolean)
      .join(', ');
  }
}
