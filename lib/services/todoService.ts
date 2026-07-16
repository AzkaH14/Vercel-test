import { GoogleSheetsRepo, Todo } from '../db/googleSheetsRepo';

export class TodoService {
  private repo: GoogleSheetsRepo;

  constructor() {
    this.repo = GoogleSheetsRepo.getInstance();
  }

  /**
   * Retrieve all todos from the database.
   */
  public async getAllTodos(): Promise<Todo[]> {
    return this.repo.getTodos();
  }

  /**
   * Validate input and create a new todo.
   */
  public async createTodo(title: string): Promise<Todo> {
    const trimmedTitle = title ? title.trim() : '';
    if (!trimmedTitle) {
      throw new Error('Task title cannot be empty.');
    }
    return this.repo.addTodo(trimmedTitle);
  }

  /**
   * Update completion status.
   */
  public async toggleTodo(id: string, completed: boolean): Promise<boolean> {
    if (!id) {
      throw new Error('Task ID is required.');
    }
    return this.repo.updateTodo(id, completed);
  }

  /**
   * Delete a todo.
   */
  public async deleteTodo(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('Task ID is required.');
    }
    return this.repo.deleteTodo(id);
  }
}
