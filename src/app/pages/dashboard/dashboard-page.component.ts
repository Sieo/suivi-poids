import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DailyLog } from '../../core/models';
import { WorkbookDataService } from '../../core/services/workbook-data.service';

interface WeightPoint {
  date: string;
  weight: number;
  x: number;
  y: number;
}

interface Insight {
  title: string;
  value: string;
  detail: string;
  tone: 'positive' | 'attention' | 'neutral';
}

const average = (values: number[]): number | null =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;

const measuredValues = (
  logs: DailyLog[],
  field: 'weightKg' | 'waterGlasses' | 'sleepHours',
): number[] =>
  logs
    .map((log) => log[field])
    .filter((value): value is number => value !== null && Number.isFinite(value));

@Component({
  imports: [DatePipe, DecimalPipe, RouterLink],
  selector: 'app-dashboard-page',
  styleUrl: './dashboard-page.component.scss',
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent {
  protected readonly workbook = inject(WorkbookDataService);
  private readonly logs = computed(() =>
    [...this.workbook.data().dailyLogs].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn)),
  );
  private readonly weights = computed(() => measuredValues(this.logs(), 'weightKg'));
  private readonly hydrationValues = computed(() => measuredValues(this.logs(), 'waterGlasses'));
  private readonly sleepValues = computed(() => measuredValues(this.logs(), 'sleepHours'));
  protected readonly latestWeight = computed(() => this.weights().at(-1) ?? null);
  protected readonly weightChange = computed(() => {
    const weights = this.weights();
    return weights.length < 2 ? null : weights[weights.length - 1] - weights[0];
  });
  protected readonly averageHydration = computed(() => average(this.hydrationValues()));
  protected readonly hydrationDays = computed(() => this.hydrationValues().length);
  protected readonly daysAtHydrationReference = computed(
    () => this.hydrationValues().filter((glasses) => glasses >= 8).length,
  );
  protected readonly averageSleep = computed(() => average(this.sleepValues()));
  protected readonly sleepDays = computed(() => this.sleepValues().length);

  protected readonly mealCounts = computed(() => {
    const plans = this.workbook.data().mealPlans;
    const statuses = plans.flatMap((plan) => [plan.breakfast, plan.lunch, plan.dinner]);
    const respected = statuses.filter((meal) => meal.status === 'respected').length;
    const notRespected = statuses.filter((meal) => meal.status === 'not-respected').length;
    const planned = statuses.filter((meal) => meal.status === 'planned').length;
    const replaced = statuses.filter((meal) => meal.status === 'replaced').length;
    const recorded = respected + notRespected;
    return {
      respected,
      notRespected,
      planned,
      replaced,
      recorded,
      adherence: recorded ? (respected / recorded) * 100 : null,
    };
  });

  protected readonly weightPoints = computed<WeightPoint[]>(() => {
    const weights = this.logs()
      .filter((log) => log.weightKg !== null && Number.isFinite(log.weightKg))
      .map((log) => ({ date: log.loggedOn, weight: log.weightKg! }));
    if (!weights.length) {
      return [];
    }

    const values = weights.map((point) => point.weight);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const padding = Math.max((maximum - minimum) * 0.2, 0.5);
    const chartRange = maximum - minimum + padding * 2;

    return weights.map((point, index) => ({
      ...point,
      x: weights.length === 1 ? 50 : 6 + (index / (weights.length - 1)) * 88,
      y: 12 + ((maximum + padding - point.weight) / chartRange) * 132,
    }));
  });
  protected readonly weightPath = computed(() =>
    this.weightPoints()
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
  );
  protected readonly insights = computed<Insight[]>(() => {
    const hydration = this.averageHydration();
    const sleep = this.averageSleep();
    const meals = this.mealCounts();

    return [
      {
        title: 'Hydratation',
        value:
          hydration === null ? 'Pas encore renseignée' : `${hydration.toFixed(1)} verres / jour`,
        detail:
          hydration === null
            ? 'Renseignez l’eau dans le suivi quotidien pour voir votre tendance.'
            : `${this.daysAtHydrationReference()} jour(s) sur ${this.hydrationDays()} au-dessus du repère indicatif de 8 verres.`,
        tone:
          hydration === null
            ? 'neutral'
            : this.daysAtHydrationReference() >= this.hydrationDays() / 2
              ? 'positive'
              : 'attention',
      },
      {
        title: 'Sommeil',
        value: sleep === null ? 'Pas encore renseigné' : `${sleep.toFixed(1)} h / nuit`,
        detail:
          sleep === null
            ? 'Renseignez vos heures de sommeil pour observer votre rythme.'
            : `Moyenne calculée sur ${this.sleepDays()} nuit(s) renseignée(s). Le repère 7–9 h est indicatif.`,
        tone: sleep === null ? 'neutral' : sleep >= 7 && sleep <= 9 ? 'positive' : 'attention',
      },
      {
        title: 'Repas suivis',
        value:
          meals.adherence === null
            ? 'Pas encore renseignés'
            : `${meals.adherence.toFixed(0)} % respectés`,
        detail:
          meals.recorded === 0
            ? `${meals.replaced} repas remplacé(s) et ${meals.planned} à renseigner.`
            : `${meals.respected} respecté(s), ${meals.notRespected} non respecté(s), ${meals.replaced} remplacé(s) et ${meals.planned} à renseigner.`,
        tone:
          meals.adherence === null ? 'neutral' : meals.adherence >= 75 ? 'positive' : 'attention',
      },
    ];
  });

  protected formatWeightChange(change: number): string {
    const sign = change > 0 ? '+' : change < 0 ? '−' : '';
    return `${sign}${Math.abs(change).toFixed(1)} kg`;
  }
}
