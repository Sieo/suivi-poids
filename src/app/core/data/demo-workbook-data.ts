import {
  DailyLog,
  MealPlan,
  PortionGuide,
  ReadingItem,
  ShoppingItem,
  Week,
  WorkbookData,
} from '../models';

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const dayLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const meals = [
  ['Porridge froid aux fruits', 'Bowl saumon & avocat', 'Soupe de lentilles corail'],
  ['Bol yaourt & granola', 'Salade de pois chiches', 'Curry doux de légumes'],
  ['Pancakes à la banane', 'Bowl quinoa & légumes', 'Omelette aux tomates'],
  ['Porridge froid aux fruits', 'Wrap poulet & crudités', 'Soupe de lentilles corail'],
  ['Bol yaourt & granola', 'Bowl saumon & avocat', 'Curry doux de légumes'],
  ['Pancakes à la banane', 'Salade de pois chiches', 'Légumes rôtis & feta'],
  ['Porridge froid aux fruits', 'Bowl quinoa & légumes', 'Omelette aux tomates'],
];

export const createDemoWorkbookData = (): WorkbookData => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const week: Week = {
    id: `demo-${toIsoDate(start)}`,
    profileId: 'local-profile',
    startsOn: toIsoDate(start),
    endsOn: toIsoDate(end),
    title: 'Planning de démonstration',
    notes: null,
  };

  const mealPlans: MealPlan[] = dayLabels.map((dayLabel, day) => {
    const date = new Date(start);
    date.setDate(start.getDate() + day);
    const plan: MealPlan = {
      id: `${week.id}-${toIsoDate(date)}`,
      weekId: week.id,
      plannedOn: toIsoDate(date),
      dayLabel,
      breakfast: { description: meals[day][0], status: 'planned' },
      lunch: { description: meals[day][1], status: 'planned' },
      dinner: { description: meals[day][2], status: 'planned' },
      snacks: '',
      estimatedKcal: '',
      notes: '',
    };
    return plan;
  });

  const dailyLogs: DailyLog[] = mealPlans.map((plan) => ({
    id: plan.id,
    profileId: week.profileId,
    loggedOn: plan.plannedOn,
    weightKg: null,
    hungerLevel: null,
    waterGlasses: null,
    activity: '',
    mealsFollowed: '',
    snacksConsumed: '',
    emotionalHunger: null,
    sleepHours: null,
    notes: null,
  }));
  const emptyPortions: PortionGuide[] = [];
  const emptyShopping: ShoppingItem[] = [];
  const emptyReading: ReadingItem[] = [];

  return {
    version: 1,
    sourceFileName: null,
    importedAt: null,
    week,
    mealPlans,
    portionGuides: emptyPortions,
    shoppingItems: emptyShopping,
    dailyLogs,
    readingItems: emptyReading,
  };
};
