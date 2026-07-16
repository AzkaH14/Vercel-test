import { neon } from '@neondatabase/serverless';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export class PostgresRepo {
  private static instance: PostgresRepo;
  private sql: any;

  private constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Missing DATABASE_URL configuration in environment variables.');
    }
    this.sql = neon(connectionString);
  }

  public static getInstance(): PostgresRepo {
    if (!PostgresRepo.instance) {
      PostgresRepo.instance = new PostgresRepo();
    }
    return PostgresRepo.instance;
  }

  /**
   * Helper to ensure the tasks table exists.
   */
  private async ensureTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS todos (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
  }

  /**
   * Get all tasks from the database, sorted newest first.
   */
  public async getTodos(): Promise<Todo[]> {
    await this.ensureTable();
    const rows = await this.sql`SELECT * FROM todos ORDER BY created_at DESC;`;
    
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      completed: row.completed,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  /**
   * Create a new task.
   */
  public async addTodo(title: string): Promise<Todo> {
    await this.ensureTable();
    
    const id = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();
    
    const rows = await this.sql`
      INSERT INTO todos (id, title, completed, created_at)
      VALUES (${id}, ${title}, false, ${createdAt})
      RETURNING *;
    `;
    const row = rows[0];
    
    return {
      id: row.id,
      title: row.title,
      completed: row.completed,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  /**
   * Update the completion status of a task.
   */
  public async updateTodo(id: string, completed: boolean): Promise<boolean> {
    await this.ensureTable();
    
    const rows = await this.sql`UPDATE todos SET completed = ${completed} WHERE id = ${id} RETURNING id;`;
    
    if (rows.length === 0) {
      throw new Error(`Todo with ID ${id} not found.`);
    }
    
    return true;
  }

  /**
   * Delete a task.
   */
  public async deleteTodo(id: string): Promise<boolean> {
    await this.ensureTable();
    
    const rows = await this.sql`DELETE FROM todos WHERE id = ${id} RETURNING id;`;
    
    if (rows.length === 0) {
      throw new Error(`Todo with ID ${id} not found.`);
    }
    
    return true;
  }
}
