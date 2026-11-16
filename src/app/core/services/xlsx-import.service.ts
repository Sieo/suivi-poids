import { Injectable } from '@angular/core';
import type { Sheet } from 'read-excel-file/browser';
import {
  DailyLog,
  MealPlan,
  MealPeriod,
  MealStatus,
  PortionGuide,
  Recipe,
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
  if (['remplace', 'remplace par', 'replaced'].includes(normalize(raw))) {
    return 'replaced';
  }
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
  const match = title.match(
    /semaine\s+du\s+(\d{1,2})(?:\s+([\p{L}]+)\s+(\d{4}))?\s+au\s+(\d{1,2})(?:\s+([\p{L}]+))?\s+(\d{4})/iu,
  );
  if (!match) {
    throw new Error(
      'La feuille « À lire » doit indiquer la période, par exemple « semaine du 3 au 9 novembre 2026 ».',
    );
  }

  const startMonthName = match[2] ?? match[5];
  const endMonthName = match[5] ?? match[2];
  if (!startMonthName || !endMonthName) {
    throw new Error('La période indiquée dans la feuille « À lire » doit contenir un mois.');
  }
  const startMonth = MONTHS[normalize(startMonthName).replace(/\s/g, '')];
  const endMonth = MONTHS[normalize(endMonthName).replace(/\s/g, '')];
  if (startMonth === undefined || endMonth === undefined) {
    throw new Error(`Mois non reconnu dans le titre de la semaine : ${startMonthName}.`);
  }
  const endYear = Number(match[6]);
  const startYear = match[3] ? Number(match[3]) : endYear;
  const startsOn = new Date(startYear, startMonth, Number(match[1]));
  const endsOn = new Date(endYear, endMonth, Number(match[4]));

  if (!match[3] && endsOn < startsOn) {
    endsOn.setFullYear(endsOn.getFullYear() + 1);
  }

  if (
    startsOn.getFullYear() !== startYear ||
    startsOn.getMonth() !== startMonth ||
    startsOn.getDate() !== Number(match[1]) ||
    endsOn.getFullYear() !== (match[3] ? endYear : endsOn.getFullYear()) ||
    endsOn.getMonth() !== endMonth ||
    endsOn.getDate() !== Number(match[4]) ||
    endsOn < startsOn
  ) {
    throw new Error('La période indiquée dans la feuille « À lire » est invalide.');
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
  const explicitDate = normalize(label).match(/^([a-z]+) (\d{1,2}) ([a-z]+) (\d{4})$/);
  if (explicitDate) {
    const weekday = explicitDate[1];
    const day = Number(explicitDate[2]);
    const month = MONTHS[explicitDate[3]];
    const year = Number(explicitDate[4]);
    if (month === undefined) {
      throw new Error(`Mois non reconnu dans la date « ${label} ».`);
    }

    const date = new Date(year, month, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day ||
      normalize(date.toLocaleDateString('fr-FR', { weekday: 'long' })) !== weekday
    ) {
      throw new Error(`Date de jour invalide : « ${label} ».`);
    }
    return toIsoDate(date);
  }

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

const periodForLabel = (value: string): MealPeriod => {
  const period = normalize(value);
  if (['petit dejeuner', 'petit dej', 'matin'].includes(period)) {
    return 'breakfast';
  }
  if (['dejeuner', 'midi'].includes(period)) {
    return 'lunch';
  }
  if (['diner', 'soir'].includes(period)) {
    return 'dinner';
  }
  throw new Error(`Créneau de repas non reconnu dans la feuille « Recettes » : « ${value} ».`);
};

const parseRecipeRows = (rows: CellValue[][], week: Week): Recipe[] => {
  const headers = headerMap(rows, 'Recettes');
  for (const column of ['Jour', 'Repas', 'Nom', 'Portions', 'Ingrédients', 'Préparation']) {
    requiredColumn(headers, column, 'Recettes');
  }

  return nonEmptyRows(rows).map((row) => {
    const plannedOn = dateForLabel(cellAt(row, headers, 'Jour'), week);
    const mealPeriod = periodForLabel(cellAt(row, headers, 'Repas'));
    const portions = optionalNumber(row[headers.get(normalize('Portions')) ?? -1]);
    return {
      id: `recipe-${plannedOn}-${mealPeriod}`,
      profileId: 'local-profile',
      name: cellAt(row, headers, 'Nom'),
      description: '',
      ingredients: cellAt(row, headers, 'Ingrédients'),
      instructions: cellAt(row, headers, 'Préparation') || null,
      baseServings: portions ?? 1,
      preparationMinutes: optionalNumber(
        row[headers.get(normalize('Temps de préparation (min)')) ?? -1],
      ),
      plannedOn,
      mealPeriod,
      imageUrl: cellAt(row, headers, 'Image (URL)') || null,
    };
  });
};

const parseLegacyRecipes = (rows: CellValue[][], week: Week): Recipe[] => {
  const sectionStart = rows.findIndex(
    (row) => normalize(cellText(row[0])) === 'recettes et modes de preparation',
  );
  if (sectionStart < 0) {
    return [];
  }

  const sectionEnd = rows.findIndex(
    (row, index) =>
      index > sectionStart && normalize(cellText(row[0])) === 'organisation conservation',
  );
  const recipeRows = rows.slice(sectionStart + 1, sectionEnd < 0 ? undefined : sectionEnd);
  const recipes: Recipe[] = [];
  let current: Recipe | null = null;

  for (const row of recipeRows) {
    const content = row
      .map(cellText)
      .filter(Boolean)
      .join(' ')
      .replace(/^[•\s]+/, '');
    if (!content) {
      continue;
    }

    const heading = content.match(
      /^(.+?)\s+(?:\u2013|\u2014)\s+(.+?)\s*\((\d+)\s+portions?\b.*\)$/iu,
    );
    if (heading) {
      const placement = heading[1].match(
        /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(matin|midi|soir)$/iu,
      );
      if (!placement) {
        current = null;
        continue;
      }

      const weekday = placement[1].toLocaleLowerCase('fr-FR');
      const dayNumber = weekDayInWeek(weekday, week);
      const plannedOn = dateForLabel(`${placement[1]} ${dayNumber}`, week);
      const mealPeriod = periodForLabel(placement[2]);
      current = {
        id: `recipe-${plannedOn}-${mealPeriod}`,
        profileId: 'local-profile',
        name: heading[2].trim(),
        description: '',
        ingredients: '',
        instructions: null,
        baseServings: Number(heading[3]),
        preparationMinutes: null,
        plannedOn,
        mealPeriod,
        imageUrl: null,
      };
      recipes.push(current);
      continue;
    }

    if (!current) {
      continue;
    }
    if (/^ingrédients\s*:/iu.test(content)) {
      current.ingredients = content.replace(/^ingrédients\s*:\s*/iu, '');
    } else if (/^\d+[.)]\s*/u.test(content)) {
      current.instructions = [current.instructions, content].filter(Boolean).join('\n');
    }
  }

  return recipes;
};

const weekDayInWeek = (weekday: string, week: Week): number => {
  const date = new Date(`${week.startsOn}T00:00:00`);
  const end = new Date(`${week.endsOn}T00:00:00`);
  while (date <= end) {
    if (normalize(date.toLocaleDateString('fr-FR', { weekday: 'long' })) === weekday) {
      return date.getDate();
    }
    date.setDate(date.getDate() + 1);
  }
  throw new Error(`Aucun jour « ${weekday} » trouvé dans la période du classeur.`);
};

const linkRecipesToMeals = (recipes: Recipe[], mealPlans: MealPlan[]): void => {
  const linkedMeals = new Set<string>();
  for (const recipe of recipes) {
    const key = `${recipe.plannedOn}-${recipe.mealPeriod}`;
    if (linkedMeals.has(key)) {
      throw new Error(
        `Plusieurs recettes sont associées au même repas (${recipe.plannedOn}, ${recipe.mealPeriod}).`,
      );
    }
    linkedMeals.add(key);

    const plan = mealPlans.find((item) => item.plannedOn === recipe.plannedOn);
    if (plan) {
      plan[recipe.mealPeriod].recipeId = recipe.id;
    }
  }
};

const nonEmptyRows = (rows: CellValue[][]): CellValue[][] =>
  rows.slice(1).filter((row) => row.some((value) => cellText(value) !== ''));

const nonRecipeReadingRows = (rows: CellValue[][]): CellValue[][] => {
  let inRecipes = false;
  return rows.slice(1).filter((row) => {
    const title = normalize(cellText(row[0]));
    if (title === 'recettes et modes de preparation') {
      inRecipes = true;
      return false;
    }
    if (title === 'organisation conservation') {
      inRecipes = false;
    }
    return !inRecipes;
  });
};

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

  const recipesSheet = findSheet(sheets, 'Recettes');
  const recipes = recipesSheet
    ? parseRecipeRows(recipesSheet.data as CellValue[][], week)
    : parseLegacyRecipes(readingRows, week);
  linkRecipesToMeals(recipes, mealPlans);

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
      snacksConsumed: cellAt(row, dailyHeaders, 'Collations consommées'),
      emotionalHunger: booleanFromCell(
        row[dailyHeaders.get(normalize('Faim émotionnelle / grignotage ?')) ?? -1],
      ),
      sleepHours: optionalNumber(row[dailyHeaders.get(normalize('Sommeil (h)')) ?? -1]),
      notes: cellAt(row, dailyHeaders, 'Commentaire') || null,
    };
  });

  const readingItems: ReadingItem[] = nonRecipeReadingRows(readingRows).flatMap((row, index) => {
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
    recipes,
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
