"use client";

import React, { useEffect, useState } from "react";
import styles from "./HostedZonesTable.module.css";
import { API_URL } from "../config";
import AWSPagination from "./AWSPagination";
import AWSModal from "./AWSModal";

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
  onEditClick: (zoneId: string) => void;
  onZoneClick: (zoneId: string) => void;
  onRefreshStats: () => void;
  onNotification: (type: "success" | "error", message: string) => void;
}

export default function HostedZonesTable({ onCreateClick, onEditClick, onZoneClick, onRefreshStats, onNotification }: HostedZonesTableProps) {
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState("");
  const itemsPerPage = 10;

  const fetchZones = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("route53_token");
      const url = searchQuery
        ? `${API_URL}/api/zones?name=${encodeURIComponent(searchQuery)}`
        : `${API_URL}/api/zones`;

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
    setCurrentPage(1);
    fetchZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleDelete = () => {
    if (!selectedZoneId) return;
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedZoneId) return;
    const zoneToDelete = zones.find(z => z.id === selectedZoneId);

    try {
      const token = localStorage.getItem("route53_token");
      const response = await fetch(`${API_URL}/api/zones/${selectedZoneId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete hosted zone.");
      }

      setSelectedZoneId(null);
      setIsDeleteModalOpen(false);
      fetchZones();
      onRefreshStats();
      if (zoneToDelete) {
        onNotification("success", `Successfully deleted hosted zone '${zoneToDelete.name}'.`);
      }
    } catch (err: any) {
      onNotification("error", err.message || "An error occurred during deletion.");
      setIsDeleteModalOpen(false);
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
            onClick={() => selectedZoneId && onEditClick(selectedZoneId)}
            className="btn-secondary"
            disabled={!selectedZoneId}
            style={{
              opacity: selectedZoneId ? 1 : 0.5,
              cursor: selectedZoneId ? "pointer" : "not-allowed",
            }}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="btn-secondary"
            disabled={!selectedZoneId}
            style={{
              opacity: selectedZoneId ? 1 : 0.5,
              cursor: selectedZoneId ? "pointer" : "not-allowed",
              marginLeft: "10px",
            }}
          >
            Delete
          </button>
          <button onClick={onCreateClick} className="btn-primary" style={{ marginLeft: "10px" }}>
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
              zones
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((zone) => {
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
                      <td className={styles.domainName} onClick={(e) => {
                        e.stopPropagation();
                        onZoneClick(zone.id);
                      }} style={{ color: "var(--aws-blue-interactive)", cursor: "pointer" }}>
                        {zone.name}
                      </td>
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

      <AWSPagination
        currentPage={currentPage}
        totalItems={zones.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
      />

      <AWSModal
        title="Delete hosted zone"
        isOpen={isDeleteModalOpen}
        confirmTextRequired="delete"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={executeDelete}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <p>
          Are you sure you want to delete the hosted zone <strong>{zones.find(z => z.id === selectedZoneId)?.name}</strong>?
          This action cannot be undone. All DNS records configured inside this hosted zone will be deleted.
        </p>
      </AWSModal>
    </div>
  );
}
