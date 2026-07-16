import { NextResponse } from 'next/server';
import { TodoService } from '../../../../lib/services/todoService';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { completed } = await request.json();
    
    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'Completed status must be a boolean' },
        { status: 400 }
      );
    }

    const todoService = new TodoService();
    const success = await todoService.toggleTodo(id, completed);

    if (!success) {
      return NextResponse.json(
        { error: 'Todo not found or could not be updated' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id, completed });
  } catch (error: any) {
    console.error('API PUT /api/todos/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const todoService = new TodoService();
    const success = await todoService.deleteTodo(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Todo not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('API DELETE /api/todos/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
