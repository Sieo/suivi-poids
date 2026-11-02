export interface ShoppingItem {
  id: string;
  weekId: string;
  category: string;
  name: string;
  quantity: string;
  isPurchased: boolean;
  note: string | null;
}
