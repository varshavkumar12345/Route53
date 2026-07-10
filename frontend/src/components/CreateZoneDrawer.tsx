"use client";

import React, { useState } from "react";
import styles from "./CreateZoneDrawer.module.css";
import { API_URL } from "../config";

interface CreateZoneDrawerProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateZoneDrawer({ onClose, onSuccess }: CreateZoneDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Public");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("route53_token");
      const response = await fetch("${API_URL}/api/zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          type,
          description: description || undefined,
          comment: comment || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create hosted zone.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Create hosted zone</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formScrollContainer}>
            <p className={styles.formInstructions}>
              A hosted zone is a container for records, and records contain information about how you want to route traffic for a domain.
            </p>

            <div className="form-group">
              <label htmlFor="zoneName" className="form-label">
                Domain name <span className={styles.requiredStar}>*</span>
              </label>
              <input
                id="zoneName"
                type="text"
                className="form-input"
                placeholder="e.g. example.com"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <span className={styles.helperText}>
                Enter the domain name that you want to route traffic for.
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
              <label htmlFor="zoneType" className="form-label">Type</label>
              <select
                id="zoneType"
                className={styles.select}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="Public">Public hosted zone</option>
                <option value="Private">Private hosted zone</option>
              </select>
              <span className={styles.helperText}>
                Choose **Public hosted zone** to route internet traffic, or **Private hosted zone** to route traffic in your VPCs.
              </span>
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
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create hosted zone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
