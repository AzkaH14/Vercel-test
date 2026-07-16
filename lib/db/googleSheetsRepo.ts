import { google } from 'googleapis';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export class GoogleSheetsRepo {
  private static instance: GoogleSheetsRepo;
  private auth: any;
  private sheets: any;
  private spreadsheetId: string;
  private range = 'Sheet1!A:D';

  private constructor() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!email || !privateKey || !spreadsheetId) {
      throw new Error('Missing Google Sheets configuration in environment variables.');
    }

    // Format the private key from env to handle literal and escaped newlines
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    this.auth = new google.auth.JWT(
      email,
      undefined,
      formattedPrivateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.spreadsheetId = spreadsheetId;
  }

  public static getInstance(): GoogleSheetsRepo {
    if (!GoogleSheetsRepo.instance) {
      GoogleSheetsRepo.instance = new GoogleSheetsRepo();
    }
    return GoogleSheetsRepo.instance;
  }

  /**
   * Helper to guarantee that headers are present in the Google Sheet.
   */
  private async ensureHeader(): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A1:D1',
      });

      const values = response.data.values;
      if (!values || values.length === 0 || !values[0] || values[0].length === 0) {
        // Sheet is empty, write header row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A1:D1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['id', 'title', 'completed', 'createdAt']],
          },
        });
      }
    } catch (error) {
      console.error('Error ensuring sheet header:', error);
    }
  }

  /**
   * Get all tasks from the spreadsheet, sorted newest first.
   */
  public async getTodos(): Promise<Todo[]> {
    await this.ensureHeader();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      const todos: Todo[] = [];
      // Skip row 0 (headers)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row[0]) {
          todos.push({
            id: row[0],
            title: row[1] || '',
            completed: row[2] === 'TRUE',
            createdAt: row[3] || new Date().toISOString(),
          });
        }
      }

      // Sort newest tasks first
      return todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error fetching todos from Google Sheets:', error);
      return [];
    }
  }

  /**
   * Create and append a new task to the spreadsheet.
   */
  public async addTodo(title: string): Promise<Todo> {
    await this.ensureHeader();

    const newTodo: Todo = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[newTodo.id, newTodo.title, 'FALSE', newTodo.createdAt]],
        },
      });
      return newTodo;
    } catch (error) {
      console.error('Error adding todo to Google Sheets:', error);
      throw new Error('Failed to save todo to database.');
    }
  }

  /**
   * Update the completion status of a task.
   */
  public async updateTodo(id: string, completed: boolean): Promise<boolean> {
    await this.ensureHeader();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const rowIndex = rows.findIndex((row) => row[0] === id);
      if (rowIndex === -1) {
        throw new Error(`Todo with ID ${id} not found.`);
      }

      // rowIndex in the values array is 0-based, corresponding exactly to (rowIndex + 1) in Excel/Sheets (1-based)
      const sheetRowNumber = rowIndex + 1;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Sheet1!C${sheetRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[completed ? 'TRUE' : 'FALSE']],
        },
      });

      return true;
    } catch (error) {
      console.error('Error updating todo in Google Sheets:', error);
      throw new Error('Failed to update todo.');
    }
  }

  /**
   * Remove a task row from the spreadsheet entirely without leaving a blank gap.
   */
  public async deleteTodo(id: string): Promise<boolean> {
    await this.ensureHeader();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const rowIndex = rows.findIndex((row) => row[0] === id);
      if (rowIndex === -1) {
        throw new Error(`Todo with ID ${id} not found.`);
      }

      // Retrieve the spreadsheet metadata to query the numeric sheetId of Sheet1
      const spreadsheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheetId = spreadsheetMetadata.data.sheets?.[0]?.properties?.sheetId ?? 0;

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex, // 0-indexed inclusive row in the grid (which matches array index)
                  endIndex: rowIndex + 1, // exclusive
                },
              },
            },
          ],
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting todo from Google Sheets:', error);
      throw new Error('Failed to delete todo.');
    }
  }
}
