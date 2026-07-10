"use client";

import React, { useState, useRef } from "react";
import styles from "./ImportRecordsDrawer.module.css";

interface ImportRecordsDrawerProps {
  zoneId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export default function ImportRecordsDrawer({
  zoneId,
  onClose,
  onSuccess
}: ImportRecordsDrawerProps) {
  const [zoneFileContent, setZoneFileContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setZoneFileContent(text);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the local file.");
    };
    reader.readAsText(file);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneFileContent.trim()) {
      setError("Please paste BIND zone file contents or upload a file first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("route53_token");
      const res = await fetch(`http://localhost:8000/api/zones/${zoneId}/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ zone_file_content: zoneFileContent })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to import BIND zone file.");
      }

      onSuccess(data.imported_count);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Import records</span>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleImport} className={styles.form}>
          <div className={styles.formScrollContainer}>
            <p className={styles.formInstructions}>
              Import records into this hosted zone by pasting standard BIND zone file records or uploading a local zone file. Default system records (SOA and root NS) will be skipped automatically to preserve zone authority.
            </p>

            {/* File Upload Selector */}
            <div className="form-group">
              <label className="form-label">Upload zone file</label>
              <div className={styles.uploadContainer}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.zone,.db"
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </button>
                <span className={styles.fileName}>
                  {fileInputRef.current?.files?.[0]?.name || "No file chosen"}
                </span>
              </div>
            </div>

            {/* Paste Area */}
            <div className="form-group">
              <label className="form-label">Zone file text</label>
              <textarea
                className={styles.textarea}
                placeholder={`$TTL 86400
www  IN  A      192.0.2.1
mail IN  MX  10 mail.example.com.
@    IN  TXT    "v=spf1 include:_spf.google.com ~all"`}
                rows={16}
                value={zoneFileContent}
                onChange={(e) => setZoneFileContent(e.target.value)}
              />
              <span className={styles.helperText}>
                Paste the contents of your RFC 1035 BIND zone file. TTL controls and comments are supported.
              </span>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className={styles.drawerFooter}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              {loading && <span className={styles.spinner} />}
              Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
