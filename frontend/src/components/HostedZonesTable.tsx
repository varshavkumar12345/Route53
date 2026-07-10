"use client";

import React, { useEffect, useState } from "react";
import styles from "./HostedZonesTable.module.css";

interface HostedZone {
  id: string;
  name: string;
  type: string;
  description?: string;
  comment?: string;
  record_count: number;
}

interface HostedZonesTableProps {
  onCreateClick: () => void;
  onRefreshStats: () => void;
}

export default function HostedZonesTable({ onCreateClick, onRefreshStats }: HostedZonesTableProps) {
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchZones = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("route53_token");
      const url = searchQuery
        ? `http://localhost:8000/api/zones?name=${encodeURIComponent(searchQuery)}`
        : "http://localhost:8000/api/zones";

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch hosted zones.");
      }

      const data = await response.json();
      setZones(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading zones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleDelete = async () => {
    if (!selectedZoneId) return;

    if (!confirm("Are you sure you want to delete this hosted zone and all its records? This cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("route53_token");
      const response = await fetch(`http://localhost:8000/api/zones/${selectedZoneId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete hosted zone.");
      }

      setSelectedZoneId(null);
      fetchZones();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || "An error occurred during deletion.");
    }
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Hosted zones <span className={styles.count}>({zones.length})</span></h2>
        </div>
        <div className={styles.buttonGroup}>
          <button
            onClick={handleDelete}
            className="btn-secondary"
            disabled={!selectedZoneId}
            style={{
              opacity: selectedZoneId ? 1 : 0.5,
              cursor: selectedZoneId ? "pointer" : "not-allowed",
            }}
          >
            Delete
          </button>
          <button onClick={onCreateClick} className="btn-primary">
            Create hosted zone
          </button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.searchContainer}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#5f6b7a" className={styles.searchIcon}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="Find hosted zones by domain name"
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol} />
              <th>Domain name</th>
              <th>Type</th>
              <th>Record count</th>
              <th>Description</th>
              <th>Comment</th>
              <th>Hosted zone ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.loadingCell}>
                  <div className={styles.spinner} />
                  <span>Loading hosted zones...</span>
                </td>
              </tr>
            ) : zones.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <p className={styles.emptyText}>No hosted zones found matching your search.</p>
                    <button onClick={onCreateClick} className="btn-primary" style={{ marginTop: "12px" }}>
                      Create hosted zone
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              zones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                return (
                  <tr
                    key={zone.id}
                    className={`${styles.row} ${isSelected ? styles.selectedRow : ""}`}
                    onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
                  >
                    <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelectedZoneId(isSelected ? null : zone.id)}
                      />
                    </td>
                    <td className={styles.domainName}>{zone.name}</td>
                    <td>{zone.type}</td>
                    <td>{zone.record_count}</td>
                    <td className={styles.descCell}>{zone.description || "-"}</td>
                    <td className={styles.commentCell}>{zone.comment || "-"}</td>
                    <td className={styles.zoneId}>{zone.id}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
