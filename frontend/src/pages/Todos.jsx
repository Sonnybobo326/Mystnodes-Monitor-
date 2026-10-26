import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "rigprofit-todos-v1";

const defaultTasks = [
  { id: 1, text: "Review today's profitable rigs", done: false },
  { id: 2, text: "Check electricity assumptions for ROI", done: true },
  { id: 3, text: "Compare mining coin opportunities", done: false },
];

function readTasks() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTasks;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultTasks;
  } catch {
    return defaultTasks;
  }
}

export default function Todos() {
  const [tasks, setTasks] = useState(readTasks);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const remaining = tasks.filter((task) => !task.done).length;
  const completed = tasks.length - remaining;

  const visibleTasks = useMemo(() => {
    switch (filter) {
      case "active":
        return tasks.filter((task) => !task.done);
      case "done":
        return tasks.filter((task) => task.done);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  const addTask = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setTasks((current) => [
      ...current,
      { id: Date.now() + Math.random(), text, done: false },
    ]);
    setDraft("");
  };

  const toggleTask = (id) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const deleteTask = (id) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  const clearCompleted = () => {
    setTasks((current) => current.filter((task) => !task.done));
    setFilter("all");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="todos-page">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
        Planner
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 mb-8">
        To-do list
      </h1>

      <div className="border border-slate-200 bg-white p-5 sm:p-6 shadow-[6px_6px_0_0_rgba(15,23,42,0.08)] mb-6">
        <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-3">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a task..."
            className="flex-1 bg-white border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
            data-testid="todo-input"
          />
          <button
            type="submit"
            className="bg-slate-900 text-white px-5 py-3 text-xs font-bold uppercase tracking-wider hover:bg-emerald-600 transition-colors"
            data-testid="todo-add"
          >
            Add task
          </button>
        </form>
      </div>

      <div className="border border-slate-200 bg-slate-50 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-mono text-slate-700">
          <span className="bg-white border border-slate-200 px-2 py-1">{remaining} active</span>
          <span className="bg-white border border-slate-200 px-2 py-1">{completed} done</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "done", label: "Done" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                filter === item.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-300 text-slate-700 hover:border-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={clearCompleted}
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-slate-300 bg-white text-slate-700 hover:border-red-500 hover:text-red-600 transition-colors"
            disabled={completed === 0}
          >
            Clear done
          </button>
        </div>
      </div>

      <div className="border border-slate-200 bg-white">
        {visibleTasks.length === 0 ? (
          <div className="p-10 text-center text-sm font-mono text-slate-500">
            No tasks in this view. Add one above.
          </div>
        ) : (
          <ul>
            {visibleTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 border-b border-slate-200 last:border-b-0 p-4"
                data-testid={`todo-item-${task.id}`}
              >
                <label className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span
                    className={`text-sm sm:text-base break-words ${
                      task.done ? "line-through text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {task.text}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
