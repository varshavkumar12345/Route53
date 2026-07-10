"use client";

import React, { useState, useEffect } from "react";
import styles from "./CreateZoneDrawer.module.css";

interface EditZoneDrawerProps {
  zoneId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditZoneDrawer({ zoneId, onClose, onSuccess }: EditZoneDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Public");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchZoneDetails = async () => {
      setError("");
      setLoading(true);
      try {
        const token = localStorage.getItem("route53_token");
        const response = await fetch(`http://localhost:8000/api/zones/${zoneId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load hosted zone details.");
        }

        const data = await response.json();
        setName(data.name);
        setType(data.type);
        setDescription(data.description || "");
        setComment(data.comment || "");
      } catch (err: any) {
        setError(err.message || "An error occurred while loading details.");
      } finally {
        setLoading(false);
      }
    };

    fetchZoneDetails();
  }, [zoneId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("route53_token");
      const response = await fetch(`http://localhost:8000/api/zones/${zoneId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name, // backend requires name in schema, even if unchanged
          type,
          description: description || undefined,
          comment: comment || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update hosted zone.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Edit hosted zone</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {loading ? (
          <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", gap: "10px", color: "#5f6b7a" }}>
            <div className={styles.spinner} />
            <span>Loading details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formScrollContainer}>
              <div className="form-group">
                <label className="form-label" style={{ color: "#879596" }}>
                  Domain name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  disabled
                  style={{ backgroundColor: "#f2f3f3", border: "1px solid #eaeded", cursor: "not-allowed" }}
                />
                <span className={styles.helperText}>
                  Domain name cannot be changed after creation.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#879596" }}>Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${type} hosted zone`}
                  disabled
                  style={{ backgroundColor: "#f2f3f3", border: "1px solid #eaeded", cursor: "not-allowed" }}
                />
                <span className={styles.helperText}>
                  Hosted zone type cannot be changed after creation.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="zoneDesc" className="form-label">Description</label>
                <textarea
                  id="zoneDesc"
                  rows={3}
                  className={styles.textarea}
                  placeholder="e.g. My primary application domain"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="zoneComment" className="form-label">Comment</label>
                <input
                  id="zoneComment"
                  type="text"
                  className="form-input"
                  placeholder="Optional tag or internal comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
