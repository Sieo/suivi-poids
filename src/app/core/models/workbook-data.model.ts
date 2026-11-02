import { DailyLog } from './daily-log.model';
import { MealPlan } from './meal-plan.model';
import { PortionGuide } from './portion-guide.model';
import { ReadingItem } from './reading-item.model';
import { ShoppingItem } from './shopping-item.model';
import { Week } from './week.model';

export interface WorkbookData {
  version: 1;
  sourceFileName: string | null;
  importedAt: string | null;
  week: Week;
  mealPlans: MealPlan[];
  portionGuides: PortionGuide[];
  shoppingItems: ShoppingItem[];
  dailyLogs: DailyLog[];
  readingItems: ReadingItem[];
}
