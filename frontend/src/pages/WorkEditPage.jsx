
import React, { useEffect, useState } from "react";
import {
  useNavigate,
  useParams
} from "react-router-dom";

import { useData } from "../DataContext";

export default function WorkEditPage() {
  const { workId } = useParams();
  const navigate = useNavigate();

  const {
    tasks,
    categories,
    updateTask,
    refresh
  } = useData();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Coding",
    priority: "Medium",
    due_date: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load latest work records
  useEffect(() => {
    let mounted = true;

    async function loadWork() {
      try {
        await refresh();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadWork();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  // Find selected work
  const work = tasks.find(
    (item) => String(item.id) === String(workId)
  );

  // Fill form with existing work details
  useEffect(() => {
    if (!work) return;

    setForm({
      title: work.title || "",
      description: work.description || "",
      category: work.category || "Coding",
      priority: work.priority || "Medium",
      due_date: work.due_date
        ? work.due_date.slice(0, 16)
        : ""
    });
  }, [work]);

  function change(key, value) {
    setForm((old) => ({
      ...old,
      [key]: value
    }));
  }

  // Back to Work Management
  function goBack() {
    navigate("/work");
  }

  // Save updated work
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      setMessage("Work name is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const success = await updateTask(workId, {
        ...form,
        title: form.title.trim(),

        // Preserve local date/time format
        due_date: form.due_date
          ? form.due_date + ":00"
          : null
      });

      if (!success) {
        setMessage("Unable to update work. Please try again.");
        return;
      }

      await refresh();

      navigate("/work", {
        state: {
          message: "Work updated successfully."
        }
      });

    } catch (error) {
      setMessage(
        error.message || "Unable to update work."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Loading work details...</p>
      </div>
    );
  }

  if (!work) {
    return (
      <section className="panel">
        <button
          type="button"
          className="ghost work-back-button"
          onClick={goBack}
        >
          ← Back to Work Management
        </button>

        <h2>Work not found</h2>

        <p className="muted">
          The selected work could not be found.
        </p>
      </section>
    );
  }

  return (
    <div className="work-management">

      {/* Back Button */}
      <section className="panel work-edit-header">

        <button
          type="button"
          className="ghost work-back-button"
          onClick={goBack}
        >
          ← Back to Work Management
        </button>

        <h2>Edit Work</h2>

        <p className="muted">
          Update your work details and save your changes.
        </p>

      </section>

      {/* Edit Form */}
      <section className="panel">

        <h2>Update Work</h2>

        {message && (
          <p className="work-error">{message}</p>
        )}

        <form
          className="work-form"
          onSubmit={handleSubmit}
        >

          <label>
            Work name *
            <input
              type="text"
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
                {categories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
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

          {/* Form Buttons */}
          <div className="work-form-actions">

            <button
              type="submit"
              disabled={saving || !form.title.trim()}
            >
              {saving ? "Updating..." : "Save Work"}
            </button>

            <button
              type="button"
              className="ghost"
              onClick={goBack}
            >
              Cancel
            </button>

          </div>

        </form>
      </section>

    </div>
  );
}
