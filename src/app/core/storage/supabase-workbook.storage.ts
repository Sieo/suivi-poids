import { inject, Injectable } from '@angular/core';
import { isWorkbookData, WorkbookData } from '../models/workbook-data.model';
import { SUPABASE_CLIENT } from '../supabase/supabase-client';
import { WorkbookStorage } from './workbook-storage';

@Injectable({ providedIn: 'root' })
export class SupabaseWorkbookStorage implements WorkbookStorage {
  private readonly client = inject(SUPABASE_CLIENT);

  async load(userId: string): Promise<WorkbookData | null> {
    const client = await this.client;
    const { data, error } = await client
      .from('user_workbooks')
      .select('workbook_data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Impossible de charger les données du compte : ${error.message}`);
    }

    if (!data) {
      return null;
    }

    if (!isWorkbookData(data.workbook_data)) {
      throw new Error('Les données enregistrées dans Supabase ne sont pas reconnues.');
    }

    return data.workbook_data;
  }

  async save(userId: string, workbookData: WorkbookData): Promise<void> {
    const client = await this.client;
    const { error } = await client.from('user_workbooks').upsert(
      {
        user_id: userId,
        workbook_data: workbookData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      throw new Error(`Impossible d’enregistrer les données dans Supabase : ${error.message}`);
    }
  }
}
