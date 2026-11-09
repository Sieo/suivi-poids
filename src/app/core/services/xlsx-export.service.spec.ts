import { createDemoWorkbookData } from '../data/demo-workbook-data';
import { parseWorkbookSheets } from './xlsx-import.service';
import { buildWorkbookSheets } from './xlsx-export.service';

describe('buildWorkbookSheets', () => {
  it('exports the five importable sheets and preserves the tracked fields', () => {
    const data = createDemoWorkbookData();
    const plan = data.mealPlans[0];
    plan.breakfast.status = 'respected';
    plan.lunch.status = 'not-respected';
    plan.dinner.status = 'replaced';
    plan.notes = 'Dîner remplacé par une salade.';
    data.dailyLogs[0].weightKg = 72.4;
    data.dailyLogs[0].waterGlasses = 7;
    data.shoppingItems.push({
      id: 'item-1',
      weekId: data.week.id,
      category: 'Fruits',
      name: 'Pommes',
      quantity: '3 pièces',
      isPurchased: true,
      note: null,
    });
    data.portionGuides.push({
      id: 'portion-1',
      food: 'Riz',
      portion: '60 g',
      note: 'Poids cru',
    });
    data.readingItems.push({
      id: 'reading-1',
      title: 'Repère',
      category: 'Conseils',
      content: 'Boire régulièrement.',
    });
    data.dailyLogs.push({
      ...data.dailyLogs[0],
      id: 'historical-log',
      loggedOn: '2024-01-01',
      weightKg: 80.2,
    });
    data.mealPlans.push({
      ...plan,
      id: 'historical-plan',
      weekId: 'previous-week',
      plannedOn: '2024-01-01',
      dayLabel: 'Lundi 1',
    });

    const sheets = buildWorkbookSheets(data);
    expect(sheets.map((sheet) => sheet.sheet)).toEqual([
      'Planning semaine',
      'Repères portions',
      'Liste de courses',
      'Suivi quotidien',
      'À lire',
    ]);

    const imported = parseWorkbookSheets(
      sheets as Parameters<typeof parseWorkbookSheets>[0],
      'tempo-export.xlsx',
    );
    expect(imported.mealPlans[0]).toMatchObject({
      breakfast: { status: 'respected' },
      lunch: { status: 'not-respected' },
      dinner: { status: 'replaced' },
      notes: 'Dîner remplacé par une salade.',
    });
    expect(imported.mealPlans.find((mealPlan) => mealPlan.plannedOn === '2024-01-01')).toMatchObject({
      breakfast: { description: plan.breakfast.description },
    });
    expect(imported.dailyLogs.find((log) => log.loggedOn === '2024-01-01')).toMatchObject({
      weightKg: 80.2,
    });
    expect(
      imported.dailyLogs.find((log) => log.loggedOn === data.dailyLogs[0].loggedOn),
    ).toMatchObject({ weightKg: 72.4, waterGlasses: 7 });
    expect(imported.shoppingItems[0]).toMatchObject({ name: 'Pommes', isPurchased: true });
    expect(imported.portionGuides[0]).toMatchObject({ food: 'Riz', portion: '60 g' });
    expect(imported.readingItems[0].content).toBe('Boire régulièrement.');
  });

  it('exports periods that cross a month boundary in an importable format', () => {
    const data = createDemoWorkbookData();
    data.week.startsOn = '2026-12-28';
    data.week.endsOn = '2027-01-03';
    data.week.title = 'Planning personnalisé';
    data.mealPlans = [];
    data.dailyLogs = [];

    const sheets = buildWorkbookSheets(data);
    expect(sheets[4].data[0][0]).toContain('semaine du 28 décembre 2026 au 3 janvier 2027');
    expect(() =>
      parseWorkbookSheets(sheets as Parameters<typeof parseWorkbookSheets>[0], 'tempo-export.xlsx'),
    ).not.toThrow();
  });
});
