import { Injectable } from '@angular/core';
import type { Sheet } from 'read-excel-file/browser';
import {
  DailyLog,
  MealPlan,
  MealStatus,
  PortionGuide,
  ReadingItem,
  ShoppingItem,
  Week,
  WorkbookData,
} from '../models';

export type WorkbookSheet = Sheet[];
type CellValue = string | number | boolean | Date | null;
type HeaderMap = Map<string, number>;

export const REQUIRED_SHEETS = [
  'Planning semaine',
  'Repères portions',
  'Liste de courses',
  'Suivi quotidien',
  'À lire',
];

const MONTHS: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
};

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const cellText = (value: CellValue | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('fr-FR');
  }

  return String(value).trim();
};

const cellAt = (row: CellValue[], headers: HeaderMap, title: string): string =>
  cellText(row[headers.get(normalize(title)) ?? -1]);

const headerMap = (rows: CellValue[][], sheetName: string): HeaderMap => {
  const header = rows[0] ?? [];
  const result = new Map<string, number>();

  header.forEach((value, index) => {
    const key = normalize(cellText(value));
    if (key) {
      result.set(key, index);
    }
  });

  if (result.size === 0) {
    throw new Error(`La feuille « ${sheetName} » ne contient pas d’en-têtes.`);
  }

  return result;
};

const requiredColumn = (headers: HeaderMap, title: string, sheetName: string): number => {
  const index = headers.get(normalize(title));
  if (index === undefined) {
    throw new Error(`Colonne « ${title} » introuvable dans la feuille « ${sheetName} ».`);
  }
  return index;
};

const statusFromCell = (value: CellValue | undefined): MealStatus => {
  const raw = cellText(value);
  if (['☑', '✓', '✔'].includes(raw)) {
    return 'respected';
  }
  if (['☐', '✗', '✘'].includes(raw)) {
    return 'not-respected';
  }

  const normalized = normalize(raw);
  if (['oui', 'yes', 'true', '1'].includes(normalized)) {
    return 'respected';
  }
  if (['non', 'no', 'false', '0'].includes(normalized)) {
    return 'not-respected';
  }
  return 'planned';
};

const booleanFromCell = (value: CellValue | undefined): boolean | null => {
  const status = statusFromCell(value);
  if (status === 'respected') {
    return true;
  }
  if (status === 'not-respected') {
    return false;
  }
  return null;
};

const optionalNumber = (value: CellValue | undefined): number | null => {
  const raw = cellText(value).replace(',', '.');
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const findSheet = (sheets: WorkbookSheet, requiredName: string): Sheet | undefined =>
  sheets.find((sheet) => normalize(sheet.sheet) === normalize(requiredName));

const rowsFor = (sheets: WorkbookSheet, name: string): CellValue[][] => {
  const sheet = findSheet(sheets, name);
  if (!sheet) {
    const available = sheets.map((item) => item.sheet).join(', ');
    throw new Error(`Feuille « ${name} » manquante. Feuilles trouvées : ${available || 'aucune'}.`);
  }
  return sheet.data as CellValue[][];
};

const parseWeek = (readingRows: CellValue[][]): Week => {
  const title = cellText(readingRows[0]?.[0]);
  const match = title.match(/semaine\s+du\s+(\d{1,2})\s+au\s+(\d{1,2})\s+([\p{L}]+)\s+(\d{4})/iu);
  if (!match) {
    throw new Error(
      'La feuille « À lire » doit indiquer la période, par exemple « semaine du 3 au 9 novembre 2026 ».',
    );
  }

  const month = MONTHS[normalize(match[3]).replace(/\s/g, '')];
  if (month === undefined) {
    throw new Error(`Mois non reconnu dans le titre de la semaine : ${match[3]}.`);
  }
  const year = Number(match[4]);
  const startsOn = new Date(year, month, Number(match[1]));
  const endsOn = new Date(year, month, Number(match[2]));

  if (endsOn < startsOn) {
    endsOn.setFullYear(endsOn.getFullYear() + 1);
  }

  return {
    id: `${startsOn.getFullYear()}-${String(startsOn.getMonth() + 1).padStart(2, '0')}-${String(startsOn.getDate()).padStart(2, '0')}`,
    profileId: 'local-profile',
    startsOn: toIsoDate(startsOn),
    endsOn: toIsoDate(endsOn),
    title,
    notes: null,
  };
};

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const dateForLabel = (label: string, week: Week): string => {
  const match = label.match(/^(.+?)\s+(\d{1,2})$/);
  if (!match) {
    throw new Error(`Date de jour non reconnue : « ${label} ».`);
  }

  const weekday = normalize(match[1]);
  const dayOfMonth = Number(match[2]);
  const start = new Date(`${week.startsOn}T00:00:00`);
  const end = new Date(`${week.endsOn}T00:00:00`);

  for (let monthOffset = -1; monthOffset <= 1; monthOffset += 1) {
    const monthStart = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1);
    const candidate = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayOfMonth);
    const candidateWeekday = normalize(candidate.toLocaleDateString('fr-FR', { weekday: 'long' }));
    if (candidate >= start && candidate <= end && candidateWeekday === weekday) {
      return toIsoDate(candidate);
    }
  }

  throw new Error(
    `Le jour « ${label} » ne correspond pas à la période ${week.startsOn} – ${week.endsOn}.`,
  );
};

const nonEmptyRows = (rows: CellValue[][]): CellValue[][] =>
  rows.slice(1).filter((row) => row.some((value) => cellText(value) !== ''));

export const parseWorkbookSheets = (
  sheets: WorkbookSheet,
  fileName: string,
  importedAt = new Date().toISOString(),
): WorkbookData => {
  const missing = REQUIRED_SHEETS.filter((name) => !findSheet(sheets, name));
  if (missing.length) {
    throw new Error(`Feuilles obligatoires manquantes : ${missing.join(', ')}.`);
  }

  const planningRows = rowsFor(sheets, 'Planning semaine');
  const portionsRows = rowsFor(sheets, 'Repères portions');
  const shoppingRows = rowsFor(sheets, 'Liste de courses');
  const dailyRows = rowsFor(sheets, 'Suivi quotidien');
  const readingRows = rowsFor(sheets, 'À lire');
  const week = parseWeek(readingRows);
  const planningHeaders = headerMap(planningRows, 'Planning semaine');
  const portionHeaders = headerMap(portionsRows, 'Repères portions');
  const shoppingHeaders = headerMap(shoppingRows, 'Liste de courses');
  const dailyHeaders = headerMap(dailyRows, 'Suivi quotidien');

  for (const [headers, sheetName, required] of [
    [planningHeaders, 'Planning semaine', ['Jour', 'Petit-déjeuner', 'Déjeuner', 'Dîner']],
    [
      portionHeaders,
      'Repères portions',
      ['Aliment', 'Portion indiquée', 'Comment peser / remarque'],
    ],
    [
      shoppingHeaders,
      'Liste de courses',
      ['Rayon', 'Produit', 'Quantité indicative pour 1 personne / 7 jours'],
    ],
    [
      dailyHeaders,
      'Suivi quotidien',
      ['Jour', 'Poids (kg) facultatif', 'Faim / satiété (1-5)', 'Eau (verres)'],
    ],
  ] as const) {
    for (const column of required) {
      requiredColumn(headers, column, sheetName);
    }
  }

  const mealPlans: MealPlan[] = nonEmptyRows(planningRows).map((row, index) => {
    const dayLabel = cellAt(row, planningHeaders, 'Jour');
    const date = dateForLabel(dayLabel, week);
    const value = (name: string) => cellAt(row, planningHeaders, name);

    return {
      id: `${week.id}-${date}`,
      weekId: week.id,
      plannedOn: date,
      dayLabel,
      breakfast: {
        description: value('Petit-déjeuner'),
        status: statusFromCell(
          row[requiredColumn(planningHeaders, 'Petit-déj. respecté', 'Planning semaine')],
        ),
      },
      lunch: {
        description: value('Déjeuner'),
        status: statusFromCell(
          row[requiredColumn(planningHeaders, 'Déjeuner respecté', 'Planning semaine')],
        ),
      },
      dinner: {
        description: value('Dîner'),
        status: statusFromCell(
          row[requiredColumn(planningHeaders, 'Dîner respecté', 'Planning semaine')],
        ),
      },
      snacks: value('Collations (selon faim)'),
      estimatedKcal: value('Estimation kcal/jour'),
      notes: value('Notes / écarts'),
    };
  });

  const portionGuides: PortionGuide[] = nonEmptyRows(portionsRows).map((row, index) => ({
    id: `portion-${index}`,
    food: cellAt(row, portionHeaders, 'Aliment'),
    portion: cellAt(row, portionHeaders, 'Portion indiquée'),
    note: cellAt(row, portionHeaders, 'Comment peser / remarque'),
  }));

  const shoppingItems: ShoppingItem[] = nonEmptyRows(shoppingRows).map((row, index) => ({
    id: `shopping-${index}`,
    weekId: week.id,
    category: cellAt(row, shoppingHeaders, 'Rayon') || 'Autres',
    name: cellAt(row, shoppingHeaders, 'Produit'),
    quantity: cellAt(row, shoppingHeaders, 'Quantité indicative pour 1 personne / 7 jours'),
    isPurchased: booleanFromCell(row[shoppingHeaders.get(normalize('Acheté')) ?? -1]) ?? false,
    note:
      normalize(cellAt(row, shoppingHeaders, 'Rayon')) === 'note'
        ? cellAt(row, shoppingHeaders, 'Produit')
        : null,
  }));

  const dailyLogs: DailyLog[] = nonEmptyRows(dailyRows).map((row, index) => {
    const dayLabel = cellAt(row, dailyHeaders, 'Jour');
    const loggedOn = dateForLabel(dayLabel, week);
    const hunger = optionalNumber(
      row[requiredColumn(dailyHeaders, 'Faim / satiété (1-5)', 'Suivi quotidien')],
    );

    return {
      id: `${week.id}-${loggedOn}`,
      profileId: 'local-profile',
      loggedOn,
      weightKg: optionalNumber(row[dailyHeaders.get(normalize('Poids (kg) facultatif')) ?? -1]),
      hungerLevel: hunger,
      waterGlasses: optionalNumber(
        row[requiredColumn(dailyHeaders, 'Eau (verres)', 'Suivi quotidien')],
      ),
      activity: cellAt(row, dailyHeaders, 'Activité réalisée'),
      mealsFollowed: cellAt(row, dailyHeaders, 'Repas / portions suivis'),
      emotionalHunger: booleanFromCell(
        row[dailyHeaders.get(normalize('Faim émotionnelle / grignotage ?')) ?? -1],
      ),
      sleepHours: optionalNumber(row[dailyHeaders.get(normalize('Sommeil (h)')) ?? -1]),
      notes: cellAt(row, dailyHeaders, 'Commentaire') || null,
    };
  });

  const readingItems: ReadingItem[] = readingRows.slice(1).flatMap((row, index) => {
    const content = row.map(cellText).filter(Boolean).join(' ');
    if (!content) {
      return [];
    }

    return [
      {
        id: `reading-${index}`,
        title: `Repère ${index}`,
        content: content.replace(/^[•\s]+/, ''),
        category: 'Conseils',
      },
    ];
  });

  return {
    version: 1,
    sourceFileName: fileName,
    importedAt,
    week,
    mealPlans,
    portionGuides,
    shoppingItems,
    dailyLogs,
    readingItems,
  };
};

@Injectable({ providedIn: 'root' })
export class XlsxImportService {
  async parse(file: File): Promise<WorkbookData> {
    if (!file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      throw new Error('Choisissez un fichier au format .xlsx.');
    }
    if (file.size === 0) {
      throw new Error('Le fichier sélectionné est vide.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Le fichier dépasse la limite de 10 Mo.');
    }

    const { default: readXlsxFile } = await import('read-excel-file/browser');
    const sheets = await readXlsxFile(file);
    return parseWorkbookSheets(sheets, file.name);
  }
}
