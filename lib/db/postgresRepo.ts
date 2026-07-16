import { Pool } from '@neondatabase/serverless';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export class PostgresRepo {
  private static instance: PostgresRepo;
  private pool: Pool;

  private constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Missing DATABASE_URL configuration in environment variables.');
    }
    this.pool = new Pool({ connectionString });
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
    const query = `
      CREATE TABLE IF NOT EXISTS todos (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.pool.query(query);
  }

  /**
   * Get all tasks from the database, sorted newest first.
   */
  public async getTodos(): Promise<Todo[]> {
    await this.ensureTable();
    const query = 'SELECT * FROM todos ORDER BY created_at DESC;';
    const result = await this.pool.query(query);
    
    return result.rows.map(row => ({
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
    
    // Generate a unique ID (similar to the previous implementation)
    const id = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();
    
    const query = `
      INSERT INTO todos (id, title, completed, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    
    const result = await this.pool.query(query, [id, title, false, createdAt]);
    const row = result.rows[0];
    
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
    
    const query = 'UPDATE todos SET completed = $1 WHERE id = $2 RETURNING id;';
    const result = await this.pool.query(query, [completed, id]);
    
    if (result.rowCount === 0) {
      throw new Error(`Todo with ID ${id} not found.`);
    }
    
    return true;
  }

  /**
   * Delete a task.
   */
  public async deleteTodo(id: string): Promise<boolean> {
    await this.ensureTable();
    
    const query = 'DELETE FROM todos WHERE id = $1 RETURNING id;';
    const result = await this.pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error(`Todo with ID ${id} not found.`);
    }
    
    return true;
  }
}
