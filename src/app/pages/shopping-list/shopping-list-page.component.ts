import { Component, computed, inject } from '@angular/core';
import { ShoppingItem } from '../../core/models';
import { WorkbookDataService } from '../../core/services/workbook-data.service';

@Component({
  selector: 'app-shopping-list-page',
  styleUrl: './shopping-list-page.component.scss',
  templateUrl: './shopping-list-page.component.html',
})
export class ShoppingListPageComponent {
  protected readonly workbook = inject(WorkbookDataService);
  protected readonly categories = computed(() => {
    const groups = new Map<string, ShoppingItem[]>();
    for (const item of this.workbook.data().shoppingItems) {
      if (item.note || item.category.toLocaleLowerCase() === 'note') {
        continue;
      }
      const group = groups.get(item.category) ?? [];
      group.push(item);
      groups.set(item.category, group);
    }

    return [...groups.entries()].map(([name, items]) => ({ name, items }));
  });
  protected readonly purchasedCount = computed(
    () =>
      this.workbook.data().shoppingItems.filter((item) => item.isPurchased && !item.note).length,
  );
  protected readonly shoppingNotes = computed(() =>
    this.workbook
      .data()
      .shoppingItems.filter((item) => item.note)
      .map((item) => `${item.note} ${item.quantity}`.trim()),
  );

  protected updatePurchased(item: ShoppingItem, event: Event): void {
    this.workbook.updateShoppingItem(item.id, (event.target as HTMLInputElement).checked);
  }
}
