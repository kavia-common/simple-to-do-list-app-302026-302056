import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import TaskModal from "./components/TaskModal";
import {
  createTask,
  deleteTask,
  listTasks,
  patchTask,
  updateTask,
} from "./api/tasksApi";

function normalizeError(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  return "Request failed";
}

// PUBLIC_INTERFACE
function App() {
  /** Main To-Do app: list/create/update/delete tasks via backend REST API. */
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [filter, setFilter] = useState("all"); // all | pending | completed
  const [query, setQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add | edit
  const [activeTask, setActiveTask] = useState(null);

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const [deletingIds, setDeletingIds] = useState(() => new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listTasks();
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch (e) {
      setLoadError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filter === "pending") return t.status === "pending";
        if (filter === "completed") return t.status === "completed";
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        return (
          (t.title || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // pending first, then completed; newest id first
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        return (b.id || 0) - (a.id || 0);
      });
  }, [tasks, filter, query]);

  const counts = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return { total: tasks.length, pending, completed };
  }, [tasks]);

  const openAdd = () => {
    setModalError(null);
    setModalMode("add");
    setActiveTask(null);
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setModalError(null);
    setModalMode("edit");
    setActiveTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleSubmitModal = async (payload) => {
    setSaving(true);
    setModalError(null);
    try {
      if (modalMode === "add") {
        // OpenAPI requires status always present
        const created = await createTask({
          title: payload.title,
          description: payload.description || "",
          status: payload.status || "pending",
        });
        setTasks((prev) => [created, ...prev]);
        setModalOpen(false);
      } else {
        const id = activeTask?.id;
        if (!id) throw new Error("Missing task id");

        // Use PUT for full update (matches OpenAPI). Ensure required fields are present.
        const updated = await updateTask(id, {
          title: payload.title,
          description: payload.description || "",
          status: payload.status || "pending",
        });

        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        setModalOpen(false);
      }
    } catch (e) {
      setModalError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      const updated = await patchTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      // revert on error
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setLoadError(normalizeError(e));
    }
  };

  const handleDelete = async (task) => {
    const id = task.id;
    if (!id) return;

    const ok = window.confirm(`Delete "${task.title}"?`);
    if (!ok) return;

    setDeletingIds((prev) => new Set(prev).add(id));

    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await deleteTask(id);
    } catch (e) {
      // restore on error
      setTasks((prev) => [task, ...prev]);
      setLoadError(normalizeError(e));
    } finally {
      setDeletingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  return (
    <div className="App">
      <div className="page">
        <header className="header">
          <div className="brand">
            <h1 className="title">To‑Do</h1>
            <p className="subtitle">
              Manage tasks with a clean, fast workflow (pending/completed).
            </p>
          </div>

          <div className="headerActions">
            <div className="pill" title="Task counts">
              <span className="pillDot" aria-hidden="true" />
              <span>
                {counts.pending} pending • {counts.completed} completed
              </span>
            </div>

            <button className="btn btnSecondary" onClick={refresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <main className="main">
          <section className="panel" aria-label="Task list panel">
            <div className="panelHeader">
              <div>
                <h2 className="panelTitle">Your tasks</h2>
                <div className="smallMuted">
                  {filteredTasks.length} shown • {counts.total} total
                </div>
              </div>

              <div className="toolbar">
                <div className="search" aria-label="Search tasks">
                  <span aria-hidden="true">⌕</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search title or description..."
                  />
                </div>

                <div className="segment" aria-label="Filter tasks">
                  <button
                    type="button"
                    aria-pressed={filter === "all"}
                    onClick={() => setFilter("all")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    aria-pressed={filter === "pending"}
                    onClick={() => setFilter("pending")}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    aria-pressed={filter === "completed"}
                    onClick={() => setFilter("completed")}
                  >
                    Completed
                  </button>
                </div>

                <button className="btn btnPrimary" onClick={openAdd}>
                  Add task
                </button>
              </div>
            </div>

            {loadError ? (
              <div className="inlineError" role="alert">
                <strong>Couldn’t load tasks.</strong> {loadError}{" "}
                <button className="btn btnSecondary" onClick={refresh} style={{ marginLeft: 10 }}>
                  Retry
                </button>
                <div className="smallMuted" style={{ marginTop: 8 }}>
                  Note: ensure the backend is running on http://localhost:3001 and CORS allows
                  http://localhost:3000.
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="state" aria-label="Loading tasks">
                <div className="spinner" aria-hidden="true" />
                <div>Loading tasks…</div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="state" aria-label="No tasks">
                <div style={{ fontWeight: 700, color: "var(--text)" }}>
                  No tasks match your view.
                </div>
                <div>Try changing the filter/search, or add a new task.</div>
                <button className="btn btnPrimary" onClick={openAdd}>
                  Add your first task
                </button>
              </div>
            ) : (
              <ul className="list" aria-label="Task list">
                {filteredTasks.map((t) => {
                  const completed = t.status === "completed";
                  const isDeleting = deletingIds.has(t.id);

                  return (
                    <li key={t.id} className="card" aria-label={`Task ${t.title}`}>
                      <div className="cardMain">
                        <div className="cardTitleRow">
                          <h3 className="cardTitle">{t.title}</h3>
                          <span className={`badge ${completed ? "badgeCompleted" : ""}`}>
                            <span className="badgeDot" aria-hidden="true" />
                            {completed ? "Completed" : "Pending"}
                          </span>
                        </div>
                        {t.description ? (
                          <p className="cardDesc">{t.description}</p>
                        ) : (
                          <p className="cardDesc" style={{ fontStyle: "italic", opacity: 0.75 }}>
                            No description
                          </p>
                        )}
                      </div>

                      <div className="cardActions">
                        <button
                          type="button"
                          className="toggle"
                          data-checked={completed ? "true" : "false"}
                          onClick={() => handleToggleStatus(t)}
                          aria-label={`Mark as ${completed ? "pending" : "completed"}`}
                          disabled={isDeleting}
                        >
                          <span className="toggleKnob" aria-hidden="true" />
                          <span className="toggleLabel">
                            {completed ? "Completed" : "Pending"}
                          </span>
                        </button>

                        <button
                          className="btn btnSecondary"
                          onClick={() => openEdit(t)}
                          disabled={isDeleting}
                        >
                          Edit
                        </button>

                        <button
                          className="btn btnDanger"
                          onClick={() => handleDelete(t)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>
      </div>

      <button className="fab" onClick={openAdd} aria-label="Add task (floating)">
        +
      </button>

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        initialTask={activeTask}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
        busy={saving}
        error={modalError}
      />
    </div>
  );
}

export default App;
