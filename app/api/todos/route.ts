import { NextResponse } from 'next/server';
import { TodoService } from '../../../lib/services/todoService';

export async function GET() {
  try {
    const todoService = new TodoService();
    const todos = await todoService.getAllTodos();
    return NextResponse.json(todos);
  } catch (error: any) {
    console.error('API GET /api/todos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    const todoService = new TodoService();
    const newTodo = await todoService.createTodo(title);
    return NextResponse.json(newTodo, { status: 201 });
  } catch (error: any) {
    console.error('API POST /api/todos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create todo' },
      { status: 400 }
    );
  }
}
