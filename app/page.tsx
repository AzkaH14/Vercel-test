'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, ClipboardList, RefreshCw, Github } from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [gitLogs, setGitLogs] = useState<string[]>([]);
  const [showGitModal, setShowGitModal] = useState(false);

  // Trigger Local Git Sync
  const handleGitPush = async () => {
    setIsPushing(true);
    setGitLogs(['$ Starting Git synchronization...']);
    setShowGitModal(true);

    try {
      const res = await fetch('/api/git-push', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.logs) {
        setGitLogs(data.logs);
      }

      if (data.success) {
        showToast('Code successfully pushed to GitHub!');
      } else {
        showToast('Git synchronization failed. Check console.', 'error');
      }
    } catch (err: any) {
      showToast('Connection to Git API failed.', 'error');
      setGitLogs((prev) => [...prev, `[Fatal Error]: ${err.message}`]);
    } finally {
      setIsPushing(false);
    }
  };

  // Toast handler for premium user feedback
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Fetch todos from spreadsheet
  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/todos');
      if (!res.ok) {
        throw new Error('Could not pull data rows.');
      }
      const data = await res.json();
      setTodos(data);
    } catch (err: any) {
      showToast(err.message || 'Error connecting to Google Sheets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // Add a new todo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to append task row.');
      }

      const createdTodo = await res.json();
      setTodos((prev) => [createdTodo, ...prev]);
      setNewTitle('');
      showToast('Task added and synced to Google Sheets!');
    } catch (err: any) {
      showToast(err.message || 'Failed to sync task.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle todo status (Optimistic update)
  const handleToggle = async (id: string, currentStatus: boolean) => {
    setActionInProgress(id);
    const newStatus = !currentStatus;

    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: newStatus } : todo))
    );

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status.');
      }
      showToast(newStatus ? 'Task completed!' : 'Task active.');
    } catch (err: any) {
      setTodos((prev) =>
        prev.map((todo) => (todo.id === id ? { ...todo, completed: currentStatus } : todo))
      );
      showToast(err.message || 'Failed to sync status update.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Delete todo (Optimistic update)
  const handleDelete = async (id: string) => {
    setActionInProgress(id);
    const originalTodos = [...todos];

    setTodos((prev) => prev.filter((todo) => todo.id !== id));

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete row.');
      }
      showToast('Task row deleted.');
    } catch (err: any) {
      setTodos(originalTodos);
      showToast(err.message || 'Failed to delete row.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Format Dates cleanly
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Filtering
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter((todo) => !todo.completed).length;

  return (
    <main className="container">
      {/* Header */}
      <div className="header">
        <h1 className="logo-glow">FocusFlow</h1>
        <p className="subtitle">Securely Synced Task Database</p>
        <span className="sheets-badge">
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM6 6h5v3H6V6zm0 5h5v3H6v-3zm0 5h5v3H6v-3zm12 3h-5v-3h5v3zm0-5h-5v-3h5v3zm0-5h-5V6h5v3z" />
          </svg>
          Google Sheets Database Connected
        </span>
        <button 
          onClick={handleGitPush} 
          disabled={isPushing}
          className="github-badge"
          title="Push code changes to GitHub repository"
        >
          <Github size={14} />
          {isPushing ? 'Pushing Repository...' : 'Push to GitHub'}
        </button>
      </div>

      {/* Input section inside Card */}
      <div className="card">
        <form onSubmit={handleSubmit} className="todo-form">
          <input
            type="text"
            className="todo-input"
            placeholder="Add task to spreadsheet database..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={isSubmitting}
          />
          <button type="submit" className="todo-button" disabled={isSubmitting || !newTitle.trim()}>
            {isSubmitting ? (
              <span className="small-spinner" />
            ) : (
              <>
                <Plus size={16} /> Add Task
              </>
            )}
          </button>
        </form>

        {/* Tab Filter */}
        <div className="filter-tabs">
          <button
            onClick={() => setFilter('all')}
            className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          >
            All ({todos.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`tab-btn ${filter === 'active' ? 'active' : ''}`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`tab-btn ${filter === 'completed' ? 'active' : ''}`}
          >
            Completed ({todos.length - activeCount})
          </button>
        </div>

        {/* Todo List */}
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="empty-state">
            <ClipboardList className="empty-icon" />
            <div className="empty-text">
              {filter === 'all'
                ? "No tasks cataloged yet. What's on your agenda?"
                : filter === 'active'
                ? 'All clear! No active items remaining.'
                : 'No completed tasks found.'}
            </div>
          </div>
        ) : (
          <ul className="todo-list">
            {filteredTodos.map((todo) => (
              <li
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed-state' : ''}`}
              >
                <div className="todo-item-left">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      disabled={actionInProgress === todo.id}
                      onChange={() => handleToggle(todo.id, todo.completed)}
                    />
                    <span className="checkmark" />
                  </label>
                  <div className="todo-text-container">
                    <span className="todo-text">{todo.title}</span>
                    <span className="todo-time">{formatDate(todo.createdAt)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(todo.id)}
                  disabled={actionInProgress === todo.id}
                  className="delete-btn"
                  title="Remove from sheet"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Stats footer */}
        {!isLoading && todos.length > 0 && (
          <div className="stats-row">
            <span>
              {activeCount} {activeCount === 1 ? 'task' : 'tasks'} remaining
            </span>
            <button
              onClick={fetchTodos}
              className="delete-btn"
              title="Refresh and sync"
              style={{ padding: '0.2rem' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Toast Overlay */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.type === 'success' && (
              <CheckCircle2 size={16} style={{ color: 'hsl(var(--success))' }} />
            )}
            {toast.type === 'error' && (
              <Trash2 size={16} style={{ color: 'hsl(var(--danger))' }} />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Git Logs Console Modal */}
      {showGitModal && (
        <div className="modal-overlay" onClick={() => !isPushing && setShowGitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Git Repository Sync Console</h3>
              {!isPushing && (
                <button 
                  onClick={() => setShowGitModal(false)} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.45)',
                    cursor: 'pointer',
                    fontSize: '1.15rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="console-box">
              {gitLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`console-line ${
                    log.startsWith('$') ? 'cmd' : log.includes('failed') || log.includes('Error') || log.includes('Exit code') ? 'err' : ''
                  }`}
                >
                  {log}
                </div>
              ))}
              {isPushing && <div className="console-line">⠋ Pushing codebase to main...</div>}
            </div>

            {!isPushing && (
              <button 
                onClick={() => setShowGitModal(false)}
                className="todo-button"
                style={{ alignSelf: 'flex-end' }}
              >
                Close Console
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
