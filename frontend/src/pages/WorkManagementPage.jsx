import React, { useEffect, useState } from "react";
import { useData } from "../DataContext";
import { fmt } from "../utils";

const emptyForm = {
  title: "",
  description: "",
  category: "Coding",
  priority: "Medium",
  due_date: ""
};

function WorkForm({
  initial,
  categories,
  onSave,
  onCancel,
  saving
}) {
  const [form, setForm] = useState(initial || emptyForm);

  useEffect(() => {
    setForm(initial || emptyForm);
  }, [initial]);

  function change(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();

    onSave({
      ...form,
      title: form.title.trim(),

      // Preserve local date/time instead of converting to UTC
      due_date: form.due_date
        ? form.due_date + ":00"
        : null
    });
  }

  return (
    <form className="work-form" onSubmit={submit}>
      <label>
        Work name *
        <input
          value={form.title}
          onChange={(e) => change("title", e.target.value)}
          placeholder="Enter work name"
          maxLength={120}
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) => change("description", e.target.value)}
          placeholder="Describe this work"
          rows={3}
        />
      </label>

      <div className="work-form-grid">
        <label>
          Category
          <select
            value={form.category}
            onChange={(e) => change("category", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          Priority
          <select
            value={form.priority}
            onChange={(e) => change("priority", e.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </label>
      </div>

      <label>
        Deadline
        <input
          type="datetime-local"
          value={form.due_date}
          onChange={(e) => change("due_date", e.target.value)}
        />
      </label>

      <div className="work-form-actions">
        <button
          type="submit"
          disabled={saving || !form.title.trim()}
        >
          {saving ? "Saving..." : "Save Work"}
        </button>

        {onCancel && (
          <button
            type="button"
            className="ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function WorkManagementPage() {
  const {
    tasks,
    categories,
    running,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    startTask,
    stopTimer,
    refresh
  } = useData();

  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");

  async function saveWork(data) {
    setSaving(true);
    setMessage("");

    try {
      const success = editing
        ? await updateTask(editing.id, data)
        : await addTask(data);

      if (!success) return;

      setMessage(
        editing
          ? "Work updated successfully."
          : "New work added successfully."
      );

      setEditing(null);
      setShowForm(false);

      if (refresh) {
        await refresh();
      }
    } catch (error) {
      setMessage(error.message || "Unable to save work.");
    } finally {
      setSaving(false);
    }
  }

  async function pauseWork() {
    await stopTimer();
  }

  async function resumeWork(task) {
    await startTask(task);
  }

  async function completeWork(task) {
    if (
      running &&
      Number(running.task_id) === Number(task.id)
    ) {
      await stopTimer();
    }

    await toggleTask(task.id);
  }

  async function removeWork(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;

    if (
      running &&
      Number(running.task_id) === Number(task.id)
    ) {
      setMessage("Stop the running work before deleting it.");
      return;
    }

    await deleteTask(task.id);
  }

  const visibleTasks = tasks.filter((task) => {
    if (filter === "Pending") return !task.done;
    if (filter === "Completed") return task.done;
    return true;
  });

  return (
    <div className="work-management">
      <section className="panel work-header">
        <div>
          <h2>Work Management</h2>
          <p className="muted">
            Add, organize, update and track your work.
          </p>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setShowForm((value) => !value);
          }}
        >
          + Add New Work
        </button>
      </section>

      {message && (
        <p className="work-message">{message}</p>
      )}

      {showForm && (
        <section className="panel">
          <h2>{editing ? "Update Work" : "Add New Work"}</h2>

          <WorkForm
            initial={
              editing
                ? {
                    ...editing,
                    due_date: editing.due_date
                      ? editing.due_date.slice(0, 16)
                      : ""
                  }
                : emptyForm
            }
            categories={categories}
            onSave={saveWork}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            saving={saving}
          />
        </section>
      )}

      {running && (
        <section className="panel active-work-card">
          <div>
            <span className="live">Currently running</span>
            <h2>{running.title}</h2>
            <p>{running.category}</p>
          </div>

          <button className="stop" onClick={pauseWork}>
            Pause Work
          </button>
        </section>
      )}

      <section className="panel">
        <div className="work-list-heading">
          <h2>All Work ({tasks.length})</h2>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Completed</option>
          </select>
        </div>

        {visibleTasks.length === 0 ? (
          <p className="muted">
            No work found. Add your first work item.
          </p>
        ) : (
          <div className="work-list">
            {visibleTasks.map((task) => {
              const isRunning =
                running &&
                Number(running.task_id) === Number(task.id);

              return (
                <article className="work-item" key={task.id}>
                  <div className="work-item-main">
                    <div className="work-item-title">
                      <input
                        type="checkbox"
                        checked={!!task.done}
                        onChange={() => completeWork(task)}
                      />

                      <div>
                        <h3 className={task.done ? "done" : ""}>
                          {task.title}
                        </h3>

                        <p className="muted">
                          {task.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <div className="work-meta">
                      <span>{task.category}</span>

                      <span
                        className={`priority-${(
                          task.priority || "Medium"
                        ).toLowerCase()}`}
                      >
                        {task.priority || "Medium"} Priority
                      </span>

                      <span>
                        {fmt(task.spent_minutes || 0)} spent
                      </span>

                      {task.due_date && (
                        <span>
                          Due: {new Date(
                            task.due_date
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="work-actions">
                    {!task.done && (
                      isRunning ? (
                        <span className="live">Running</span>
                      ) : (
                        <button
                          className="ghost"
                          disabled={!!running}
                          onClick={() => resumeWork(task)}
                        >
                          Resume / Start
                        </button>
                      )
                    )}

                    <button
                      className="ghost"
                      onClick={() => {
                        setEditing(task);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="ghost"
                      onClick={() => removeWork(task)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
