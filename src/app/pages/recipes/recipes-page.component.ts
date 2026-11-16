import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { WorkbookDataService } from '../../core/services/workbook-data.service';

@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-recipes-page',
  styleUrl: './recipes-page.component.scss',
  templateUrl: './recipes-page.component.html',
})
export class RecipesPageComponent {
  protected readonly workbook = inject(WorkbookDataService);
  protected readonly recipeId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('recipeId'))),
    { initialValue: null },
  );
  protected readonly recipe = computed(
    () => this.workbook.data().recipes.find((item) => item.id === this.recipeId()) ?? null,
  );
  protected readonly recipes = computed(() =>
    [...this.workbook.data().recipes].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  );
}
