
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  categories,
  onSave,
  onCancel,
  saving
}) {
  const [form, setForm] = useState(emptyForm);

  function change(key, value) {
    setForm((old) => ({
      ...old,
      [key]: value
    }));
  }

  function submit(e) {
    e.preventDefault();

    onSave({
      ...form,
      title: form.title.trim(),
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
          onChange={(e) =>
            change("title", e.target.value)
          }
          placeholder="Enter work name"
          maxLength={120}
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) =>
            change("description", e.target.value)
          }
          placeholder="Describe this work"
          rows={3}
        />
      </label>

      <div className="work-form-grid">
        <label>
          Category
          <select
            value={form.category}
            onChange={(e) =>
              change("category", e.target.value)
            }
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
            onChange={(e) =>
              change("priority", e.target.value)
            }
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
          onChange={(e) =>
            change("due_date", e.target.value)
          }
        />
      </label>

      <div className="work-form-actions">
        <button
          type="submit"
          disabled={saving || !form.title.trim()}
        >
          {saving ? "Saving..." : "Save Work"}
        </button>

        <button
          type="button"
          className="ghost"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function WorkManagementPage() {
  const navigate = useNavigate();

  const {
    tasks,
    categories,
    running,
    addTask,
    deleteTask,
    toggleTask,
    startTask,
    stopTimer
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function saveWork(data) {
    setSaving(true);
    setMessage("");

    try {
      const success = await addTask(data);

      if (!success) {
        setMessage("Unable to add work. Please try again.");
        return;
      }

      setMessage("New work added successfully.");
      setShowForm(false);
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

function removeWork(task) {
  setDeleteTarget(task);
}

async function confirmDelete() {
  if (!deleteTarget) return;

  if (
    running &&
    Number(running.task_id) === Number(deleteTarget.id)
  ) {
    setMessage("Stop the running work before deleting it.");
    setDeleteTarget(null);
    return;
  }

  setDeleting(true);

  try {
    await deleteTask(deleteTarget.id);
    setDeleteTarget(null);
    setMessage("Work deleted successfully.");
  } catch (error) {
    setMessage(error.message || "Unable to delete work.");
  } finally {
    setDeleting(false);
  }
}

  const visibleTasks = tasks.filter((task) => {
    if (filter === "Pending") return !task.done;
    if (filter === "Completed") return task.done;
    return true;
  });

  return (
    <div className="work-management">

      {/* Work Header */}
      <section className="panel work-header">
        <div>
          <h2>Work Management</h2>
          <p className="muted">
            Add, organize, update and track your work.
          </p>
        </div>

        <button
          onClick={() => {
            setMessage("");
            setShowForm((value) => !value);
          }}
        >
          + Add New Work
        </button>
      </section>

      {message && (
        <p className="work-message">{message}</p>
      )}

      {/* Add Work Form */}
      {showForm && (
        <section className="panel">
          <h2>Add New Work</h2>

          <WorkForm
            categories={categories}
            onSave={saveWork}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </section>
      )}

      {/* Currently Running Work */}
      {running && (
        <section className="panel active-work-card">
          <div>
            <span className="live">
              Currently running
            </span>

            <h2>{running.title}</h2>
            <p>{running.category}</p>
          </div>

          <button
            className="stop"
            onClick={pauseWork}
          >
            Pause Work
          </button>
        </section>
      )}

      {/* All Work List */}
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
                <article
                  className="work-item"
                  key={task.id}
                >
                  <div className="work-item-main">

                    <div className="work-item-title">
                      <input
                        type="checkbox"
                        checked={!!task.done}
                        onChange={() => completeWork(task)}
                      />

                      <div>
                        <h3
                          className={
                            task.done ? "done" : ""
                          }
                        >
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

                  {/* Work Actions */}
                  <div className="work-actions">

                    {!task.done && (
                      isRunning ? (
                        <span className="live">
                          Running
                        </span>
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

                    {/* Navigate to separate Edit page */}
                    <button
                      className="ghost"
                      onClick={() =>
                        navigate(`/work/${task.id}/edit`)
                      }
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
                  {deleteTarget && (
                    <div className="delete-modal-overlay">
                        <div className="delete-modal">
                            <div className="delete-modal-icon">
                                <span>!</span>
                                </div>
                                <h2>Delete Work?</h2>
                                <p>
                                    Are you sure you want to delete
                                    <strong> "{deleteTarget.title}" </strong>?
                                    This action cannot be undone.
                                    </p>
                                <div className="delete-modal-actions">
                                    <button
                                    className="ghost"
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                    className="delete-confirm-btn"
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    >
                                        {deleting ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
