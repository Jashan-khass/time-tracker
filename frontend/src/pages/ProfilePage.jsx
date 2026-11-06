
import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setSaving(true);

    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim()
      });

      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel profile-page-card">

      <div className="profile-page-heading">

        <div className="profile-avatar-large">
          {(name.trim() || "U")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <h2>Profile Information</h2>
          <p className="muted">
            Manage your personal account details.
          </p>
        </div>

      </div>

      <form
        className="form profile-form"
        onSubmit={handleSubmit}
      >

        <label>
          Full Name

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
        </label>

        <label>
          Email Address

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            required
          />
        </label>

        {message && (
          <div className="profile-success">
            {message}
          </div>
        )}

        {error && (
          <div className="error profile-error">
            {error}
          </div>
        )}

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>

      </form>
    </section>
  );
}
