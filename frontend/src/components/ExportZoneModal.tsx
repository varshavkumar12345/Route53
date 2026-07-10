"use client";

import React, { useState } from "react";
import styles from "./ExportZoneModal.module.css";
import { API_URL } from "../config";
import AWSModal from "./AWSModal";

interface ExportZoneModalProps {
  zoneId: string;
  zoneName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExportZoneModal({
  zoneId,
  zoneName,
  isOpen,
  onClose,
  onSuccess
}: ExportZoneModalProps) {
  const [format, setFormat] = useState<"json" | "bind">("bind");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("route53_token");
      const res = await fetch(`${API_URL}/api/zones/${zoneId}/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error("Failed to export hosted zone.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `${zoneName.replace(/\.$/, "")}_zone.${format === "bind" ? "txt" : "json"}`;
      
      if (contentDisposition) {
        const matches = /filename=(.+)/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during export.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AWSModal
      title="Export hosted zone"
      isOpen={isOpen}
      confirmLabel={loading ? "Exporting..." : "Export"}
      cancelLabel="Cancel"
      onConfirm={handleExport}
      onClose={onClose}
      disabled={loading}
    >
      <div className={styles.container}>
        <p className={styles.description}>
          Export all DNS records from the hosted zone <strong>{zoneName}</strong>. Choose your preferred file format:
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.options}>
          <label className={styles.option}>
            <input
              type="radio"
              name="format"
              value="bind"
              checked={format === "bind"}
              onChange={() => setFormat("bind")}
              disabled={loading}
              className={styles.radio}
            />
            <div className={styles.optionText}>
              <strong>BIND Zone File (.txt)</strong>
              <span>RFC 1035 text format suitable for importing directly into standard BIND nameservers.</span>
            </div>
          </label>

          <label className={styles.option}>
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === "json"}
              onChange={() => setFormat("json")}
              disabled={loading}
              className={styles.radio}
            />
            <div className={styles.optionText}>
              <strong>JSON Format (.json)</strong>
              <span>Structured backup format detailing name, type, TTL, routing policy, and record values.</span>
            </div>
          </label>
        </div>
      </div>
    </AWSModal>
  );
}
