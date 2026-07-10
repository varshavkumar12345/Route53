"use client";

import React, { useState, useEffect } from "react";
import styles from "./CreateZoneDrawer.module.css";
import { API_URL } from "../config";

interface EditRecordDrawerProps {
  zoneId: string;
  zoneName: string;
  recordId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRecordDrawer({ zoneId, zoneName, recordId, onClose, onSuccess }: EditRecordDrawerProps) {
  const [prefix, setPrefix] = useState("");
  const [type, setType] = useState("A");
  const [ttl, setTtl] = useState(300);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRecordDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("route53_token");
        const response = await fetch(`${API_URL}/api/zones/${zoneId}/records`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error("Failed to load records.");
        }

        const data = await response.json();
        const rec = data.find((r: any) => r.id === recordId);
        if (!rec) {
          throw new Error("DNS record not found.");
        }

        // Deduce prefix by stripping off the zone name suffix
        let rawName = rec.name;
        if (rawName.endsWith(".")) rawName = rawName.slice(0, -1);
        let cleanZone = zoneName;
        if (cleanZone.endsWith(".")) cleanZone = cleanZone.slice(0, -1);

        let deducedPrefix = "";
        if (rawName === cleanZone) {
          deducedPrefix = "";
        } else if (rawName.endsWith("." + cleanZone)) {
          deducedPrefix = rawName.slice(0, -(cleanZone.length + 1));
        } else if (rawName.endsWith(cleanZone)) {
          // Fallback
          deducedPrefix = rawName.slice(0, -cleanZone.length);
        }

        setPrefix(deducedPrefix);
        setType(rec.type);
        setTtl(rec.ttl);
        setValue(rec.value);
      } catch (err: any) {
        setError(err.message || "An error occurred while loading record.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecordDetails();
  }, [zoneId, recordId, zoneName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("route53_token");

      // Calculate full record name
      const cleanPrefix = prefix.trim();
      const recordName = cleanPrefix ? `${cleanPrefix}.${zoneName}` : zoneName;

      const response = await fetch(`${API_URL}/api/zones/${zoneId}/records/${recordId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: recordName,
          type, // backend requires type
          ttl: Number(ttl),
          value: value.trim(),
          routing_policy: "Simple",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save record modifications.");
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
          <h2 className={styles.drawerTitle}>Edit record</h2>
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
            <span>Loading record details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formScrollContainer}>
              <div className="form-group">
                <label htmlFor="recordPrefix" className="form-label">
                  Record name
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    id="recordPrefix"
                    type="text"
                    className="form-input"
                    placeholder="e.g. www"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    disabled={type === "NS" || type === "SOA"} // Lock system record names
                    style={{
                      flexGrow: 1,
                      backgroundColor: type === "NS" || type === "SOA" ? "#f2f3f3" : undefined,
                      cursor: type === "NS" || type === "SOA" ? "not-allowed" : undefined,
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#5f6b7a", fontWeight: "bold", whiteSpace: "nowrap" }}>
                    .{zoneName}
                  </span>
                </div>
                <span className={styles.helperText}>
                  Prefix mapping to domain zones.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#879596" }}>Record type</label>
                <input
                  type="text"
                  className="form-input"
                  value={type}
                  disabled
                  style={{ backgroundColor: "#f2f3f3", border: "1px solid #eaeded", cursor: "not-allowed" }}
                />
                <span className={styles.helperText}>
                  Record types cannot be altered after creation.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="recordValue" className="form-label">Value</label>
                <textarea
                  id="recordValue"
                  rows={5}
                  className={styles.textarea}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
                <span className={styles.helperText}>
                  Enter values on separate lines.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="recordTtl" className="form-label">TTL (seconds)</label>
                <input
                  id="recordTtl"
                  type="number"
                  min={1}
                  className="form-input"
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="routingPolicy" className="form-label">Routing policy</label>
                <select id="routingPolicy" className={styles.select} disabled>
                  <option value="Simple">Simple routing</option>
                </select>
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
