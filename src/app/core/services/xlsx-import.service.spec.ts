import { parseWorkbookSheets, WorkbookSheet } from './xlsx-import.service';

describe('parseWorkbookSheets', () => {
  const sheets: WorkbookSheet = [
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
        [
          'Mardi 3',
          'Café',
          'Salade',
          'Soupe',
          'Fruit si faim',
          '≈ 1 800 kcal',
          '☑',
          '☐',
          null,
          'Repas pris au travail',
        ],
      ],
    },
    {
      sheet: 'Repères portions',
      data: [
        ['Aliment', 'Portion indiquée', 'Comment peser / remarque'],
        ['Riz', 'Poids cru', 'Peser avant cuisson.'],
      ],
    },
    {
      sheet: 'Liste de courses',
      data: [
        ['Rayon', 'Produit', 'Quantité indicative pour 1 personne / 7 jours', 'Acheté'],
        ['Fruits', 'Pommes', '3 pièces', '☑'],
        ['Note', 'Fruits au travail', 'Adapter les achats.', null],
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
        ['Mardi 3', 77.3, 3, 6, 'Marche', 'Déjeuner', '☐', 7.5, 'Bonne journée'],
      ],
    },
    {
      sheet: 'À lire',
      data: [
        ['Suivi alimentaire – semaine du 3 au 9 novembre 2026'],
        [null],
        ['• Les portions sont données en poids cru.'],
      ],
    },
  ] as WorkbookSheet;

  it('maps all five workbook tabs to local domain data', () => {
    const result = parseWorkbookSheets(sheets, 'planning.xlsx', '2026-11-02T00:00:00.000Z');

    expect(result.week.startsOn).toBe('2026-11-03');
    expect(result.week.endsOn).toBe('2026-11-09');
    expect(result.mealPlans).toHaveLength(1);
    expect(result.mealPlans[0].breakfast.status).toBe('respected');
    expect(result.mealPlans[0].lunch.status).toBe('not-respected');
    expect(result.mealPlans[0].dinner.status).toBe('planned');
    expect(result.mealPlans[0].notes).toBe('Repas pris au travail');
    expect(result.portionGuides[0].food).toBe('Riz');
    expect(result.shoppingItems[0].isPurchased).toBe(true);
    expect(result.shoppingItems[1].note).toBe('Fruits au travail');
    expect(result.dailyLogs[0]).toMatchObject({
      weightKg: 77.3,
      hungerLevel: 3,
      waterGlasses: 6,
      emotionalHunger: false,
      sleepHours: 7.5,
      snacksConsumed: '',
    });
    expect(result.readingItems[0].content).toBe('Les portions sont données en poids cru.');
    expect(result.recipes).toEqual([]);
  });

  it('imports recipes from their sheet and links them to the specified meal', () => {
    const workbook = [
      ...sheets,
      {
        sheet: 'Recettes',
        data: [
          [
            'Jour',
            'Repas',
            'Nom',
            'Portions',
            'Ingrédients',
            'Préparation',
            'Temps de préparation (min)',
            'Image (URL)',
          ],
          [
            'Mardi 3 novembre 2026',
            'Déjeuner',
            'Salade complète',
            2,
            'Riz, pois chiches',
            'Cuire le riz.\nAssembler.',
            20,
            '',
          ],
        ],
      },
    ] as WorkbookSheet;

    const result = parseWorkbookSheets(workbook, 'planning.xlsx');

    expect(result.recipes[0]).toMatchObject({
      name: 'Salade complète',
      baseServings: 2,
      ingredients: 'Riz, pois chiches',
      preparationMinutes: 20,
      plannedOn: '2026-11-03',
      mealPeriod: 'lunch',
      imageUrl: null,
    });
    expect(result.mealPlans[0].lunch.recipeId).toBe(result.recipes[0].id);
  });

  it('extracts recipes from the legacy reading sheet while keeping other reading notes', () => {
    const legacy = structuredClone(sheets);
    legacy[4].data.push(
      ['RECETTES ET MODES DE PRÉPARATION'],
      ['MARDI MIDI – SALADE COMPLÈTE (1 portion)'],
      ['Ingrédients : Riz, pois chiches.'],
      ['1. Cuire le riz.'],
      ['2. Assembler.'],
      ['SAMEDI MATIN – PETIT-DÉJEUNER SOJA (1 portion)'],
      ['Ingrédients : Yaourt soja, avoine.'],
      ['1. Mélanger et servir.'],
      ['ORGANISATION / CONSERVATION'],
      ['• Garder les restes au frais.'],
    );

    const result = parseWorkbookSheets(legacy, 'planning.xlsx');

    expect(result.recipes).toHaveLength(2);
    expect(result.recipes[0]).toMatchObject({
      name: 'SALADE COMPLÈTE',
      ingredients: 'Riz, pois chiches.',
      instructions: '1. Cuire le riz.\n2. Assembler.',
      plannedOn: '2026-11-03',
      mealPeriod: 'lunch',
    });
    expect(result.recipes[1]).toMatchObject({
      name: 'PETIT-DÉJEUNER SOJA',
      plannedOn: '2026-11-07',
      mealPeriod: 'breakfast',
    });
    expect(result.mealPlans[0].lunch.recipeId).toBe(result.recipes[0].id);
    expect(result.readingItems.map((item) => item.content)).toContain(
      'Garder les restes au frais.',
    );
    expect(result.readingItems.some((item) => item.content.includes('Cuire le riz'))).toBe(false);
  });

  it('rejects a workbook if a required sheet is missing', () => {
    expect(() => parseWorkbookSheets(sheets.slice(0, 4), 'incomplet.xlsx')).toThrow(
      'Feuilles obligatoires manquantes',
    );
  });
});
