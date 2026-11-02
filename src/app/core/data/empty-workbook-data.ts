import { WorkbookData } from '../models';

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const createEmptyWorkbookData = (userId: string): WorkbookData => {
  const startsOn = new Date();
  startsOn.setHours(0, 0, 0, 0);
  startsOn.setDate(startsOn.getDate() - ((startsOn.getDay() + 6) % 7));
  const endsOn = new Date(startsOn);
  endsOn.setDate(startsOn.getDate() + 6);

  return {
    version: 1,
    sourceFileName: null,
    importedAt: null,
    week: {
      id: `week-${userId}`,
      profileId: userId,
      startsOn: toIsoDate(startsOn),
      endsOn: toIsoDate(endsOn),
      title: 'Aucun classeur importé',
      notes: null,
    },
    mealPlans: [],
    portionGuides: [],
    shoppingItems: [],
    dailyLogs: [],
    readingItems: [],
  };
};
