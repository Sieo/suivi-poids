import { Injectable } from '@angular/core';
import { MealStatus, WorkbookData } from '../models';

type ExportCell = string | number | boolean | null;
type ExportSheet = { sheet: string; data: ExportCell[][] };

const dateLabel = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00`);
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date);
  return `${weekday.charAt(0).toLocaleUpperCase('fr-FR')}${weekday.slice(1)} ${date.getDate()}`;
};

const fullDateLabel = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00`);
  const label = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return `${label.charAt(0).toLocaleUpperCase('fr-FR')}${label.slice(1)}`;
};

const mealStatusCell = (status: MealStatus): string =>
  status === 'respected' ? '☑' : status === 'not-respected' ? '☐' : '';

const readingTitle = (data: WorkbookData): string => {
  if (/semaine\s+du\s+/iu.test(data.week.title)) {
    return data.week.title;
  }

  const start = new Date(`${data.week.startsOn}T00:00:00`);
  const end = new Date(`${data.week.endsOn}T00:00:00`);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const endMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(end);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `Suivi alimentaire – semaine du ${startDay} au ${endDay} ${endMonth} ${end.getFullYear()}`;
  }

  const startDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(start);
  const endDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(end);
  return `Suivi alimentaire – semaine du ${startDate} au ${endDate}`;
};

export const buildWorkbookSheets = (data: WorkbookData): ExportSheet[] => {
  const mealPlans = [...data.mealPlans].sort((a, b) => a.plannedOn.localeCompare(b.plannedOn));
  const dailyLogs = [...data.dailyLogs].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));
  const plansByDate = new Map(mealPlans.map((plan) => [plan.plannedOn, plan]));
  const logsByDate = new Map(dailyLogs.map((log) => [log.loggedOn, log]));
  const dates = [...new Set([...plansByDate.keys(), ...logsByDate.keys()])].sort();

  return [
    {
      sheet: 'Planning semaine',
      data: [
        [
          'Jour',
          'Petit-déjeuner',
          'Déjeuner',
          'Dîner',
          'Collations (selon faim)',
          'Estimation kcal/jour',
          'Petit-déj. respecté',
          'Déjeuner respecté',
          'Dîner respecté',
          'Notes / écarts',
        ],
        ...mealPlans.map((plan) => [
          dateLabel(plan.plannedOn),
          plan.breakfast.description,
          plan.lunch.description,
          plan.dinner.description,
          plan.snacks,
          plan.estimatedKcal,
          mealStatusCell(plan.breakfast.status),
          mealStatusCell(plan.lunch.status),
          mealStatusCell(plan.dinner.status),
          plan.notes,
        ]),
      ],
    },
    {
      sheet: 'Repères portions',
      data: [
        ['Aliment', 'Portion indiquée', 'Comment peser / remarque'],
        ...data.portionGuides.map((portion) => [portion.food, portion.portion, portion.note]),
      ],
    },
    {
      sheet: 'Liste de courses',
      data: [
        ['Rayon', 'Produit', 'Quantité indicative pour 1 personne / 7 jours', 'Acheté'],
        ...data.shoppingItems.map((item) => [
          item.category,
          item.name,
          item.quantity,
          item.isPurchased ? '☑' : '☐',
        ]),
      ],
    },
    {
      sheet: 'Suivi quotidien',
      data: [
        [
          'Jour',
          'Poids (kg) facultatif',
          'Faim / satiété (1-5)',
          'Eau (verres)',
          'Activité réalisée',
          'Repas / portions suivis',
          'Faim émotionnelle / grignotage ?',
          'Sommeil (h)',
          'Commentaire',
        ],
        ...dates.map((date) => {
          const log = logsByDate.get(date);
          return [
            fullDateLabel(date),
            log?.weightKg ?? null,
            log?.hungerLevel ?? null,
            log?.waterGlasses ?? null,
            log?.activity ?? '',
            log?.mealsFollowed ?? '',
            log?.emotionalHunger === null || log?.emotionalHunger === undefined
              ? ''
              : log.emotionalHunger
                ? '☑'
                : '☐',
            log?.sleepHours ?? null,
            log?.notes ?? '',
          ];
        }),
      ],
    },
    {
      sheet: 'À lire',
      data: [
        [readingTitle(data)],
        [null],
        ...data.readingItems.map((item) => [`• ${item.content}`]),
      ],
    },
  ];
};

@Injectable({ providedIn: 'root' })
export class XlsxExportService {
  async download(data: WorkbookData): Promise<void> {
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const sheetData = buildWorkbookSheets(data).map(({ sheet, data: rows }) => ({
      sheet,
      data: rows,
    }));
    const blob = await writeExcelFile(sheetData).toBlob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tempo-${data.week.startsOn}.xlsx`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
