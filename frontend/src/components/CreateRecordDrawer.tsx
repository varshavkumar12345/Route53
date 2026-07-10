"use client";

import React, { useState } from "react";
import styles from "./CreateZoneDrawer.module.css";
import { API_URL } from "../config";

interface CreateRecordDrawerProps {
  zoneId: string;
  zoneName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateRecordDrawer({ zoneId, zoneName, onClose, onSuccess }: CreateRecordDrawerProps) {
  const [prefix, setPrefix] = useState("");
  const [type, setType] = useState("A");
  const [ttl, setTtl] = useState(300);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("route53_token");
      
      // Calculate full record name
      const cleanPrefix = prefix.trim();
      const recordName = cleanPrefix ? `${cleanPrefix}.${zoneName}` : zoneName;

      const response = await fetch(`${API_URL}/api/zones/${zoneId}/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: recordName,
          type,
          ttl: Number(ttl),
          value: value.trim(),
          routing_policy: "Simple",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create DNS record.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderText = () => {
    switch (type) {
      case "A":
        return "192.0.2.44\n192.0.2.45";
      case "AAAA":
        return "2001:db8:85a3::8a2e:370:7334";
      case "CNAME":
        return "my-application.cloudfront.net";
      case "TXT":
        return '"sample-text-verification-string"\n"another-string"';
      case "MX":
        return "10 mailserver.example.com.";
      default:
        return "Enter record value(s) here (one per line)";
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Create record</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

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
                  style={{ flexGrow: 1 }}
                />
                <span style={{ fontSize: "14px", color: "#5f6b7a", fontWeight: "bold", whiteSpace: "nowrap" }}>
                  .{zoneName}
                </span>
              </div>
              <span className={styles.helperText}>
                The prefix of the record. Leave blank to map records directly to the zone root.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="recordType" className="form-label">Record type</label>
              <select
                id="recordType"
                className={styles.select}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="A">A - Routes traffic to an IPv4 address</option>
                <option value="AAAA">AAAA - Routes traffic to an IPv6 address</option>
                <option value="CNAME">CNAME - Routes traffic to another domain name</option>
                <option value="TXT">TXT - Text record containing verification info</option>
                <option value="MX">MX - Routes mail traffic to mail servers</option>
                <option value="NS">NS - Name servers for the zone</option>
                <option value="PTR">PTR - Pointer record for reverse lookups</option>
                <option value="SRV">SRV - Service locator records</option>
                <option value="CAA">CAA - Authorizes certificate authorities</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="recordValue" className="form-label">Value</label>
              <textarea
                id="recordValue"
                rows={5}
                className={styles.textarea}
                placeholder={getPlaceholderText()}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
              <span className={styles.helperText}>
                Enter multiple values on separate lines.
                {type === "TXT" && " Remember to wrap text values in double quotes."}
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
              <span className={styles.helperText}>
                Simple routing policy is active by default.
              </span>
            </div>
          </div>

          <div className={styles.drawerFooter}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
