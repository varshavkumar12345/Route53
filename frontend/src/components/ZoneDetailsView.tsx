"use client";

import React, { useEffect, useState } from "react";
import styles from "./ZoneDetailsView.module.css";
import CreateRecordDrawer from "./CreateRecordDrawer";
import EditRecordDrawer from "./EditRecordDrawer";
import AWSPagination from "./AWSPagination";
import AWSModal from "./AWSModal";
import AWSNotification from "./AWSNotification";

interface HostedZone {
  id: string;
  name: string;
  type: string;
  description?: string;
  comment?: string;
  record_count: number;
}

interface DnsRecord {
  id: number;
  zone_id: string;
  name: string;
  type: string;
  ttl: number;
  value: string;
  routing_policy: string;
}

interface ZoneDetailsViewProps {
  zoneId: string;
  onBackClick: () => void;
}

export default function ZoneDetailsView({ zoneId, onBackClick }: ZoneDetailsViewProps) {
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<DnsRecord | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [error, setError] = useState("");
  const itemsPerPage = 10;

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("route53_token");
      
      // Fetch Zone Metadata
      const zoneRes = await fetch(`http://localhost:8000/api/zones/${zoneId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!zoneRes.ok) throw new Error("Failed to load hosted zone metadata.");
      const zoneData = await zoneRes.json();
      setZone(zoneData);

      // Fetch Records
      const recordsUrl = searchQuery
        ? `http://localhost:8000/api/zones/${zoneId}/records?name=${encodeURIComponent(searchQuery)}`
        : `http://localhost:8000/api/zones/${zoneId}/records`;
      
      const recordsRes = await fetch(recordsUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!recordsRes.ok) throw new Error("Failed to load DNS records.");
      const recordsData = await recordsRes.json();
      setRecords(recordsData);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, searchQuery]);

  const handleDelete = () => {
    if (!selectedRecord) return;
    
    // Safety check: block UI delete for NS/SOA
    if (isSystemRecord(selectedRecord)) {
      setNotification({
        type: "error",
        message: "Default NS and SOA records are required for hosted zone routing and cannot be deleted."
      });
      return;
    }

    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedRecord) return;
    const recToDelete = selectedRecord;

    try {
      const token = localStorage.getItem("route53_token");
      const response = await fetch(`http://localhost:8000/api/zones/${zoneId}/records/${selectedRecord.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to delete record.");
      }

      setSelectedRecord(null);
      setIsDeleteModalOpen(false);
      fetchData();
      setNotification({
        type: "success",
        message: `Successfully deleted DNS record '${recToDelete.name}' [${recToDelete.type}].`
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "An error occurred during deletion."
      });
      setIsDeleteModalOpen(false);
    }
  };

  const isSystemRecord = (rec: DnsRecord) => {
    if (!zone) return false;
    return (rec.type === "NS" || rec.type === "SOA") && rec.name === zone.name;
  };

  return (
    <div className={styles.container}>
      {notification && (
        <AWSNotification
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      <div className={styles.breadcrumbs}>
        <span>Route 53</span> &gt; <span className={styles.breadcrumbLink} onClick={onBackClick}>Hosted zones</span> &gt; <span>{zone?.name || zoneId}</span>
      </div>

      <button className={`${styles.backButton} btn-secondary`} onClick={onBackClick}>
        &lt; Back to hosted zones
      </button>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {zone && (
        <div className={styles.metadataPanel}>
          <div className={styles.metadataHeader}>
            <h2 className={styles.zoneTitle}>{zone.name}</h2>
            <span className={styles.typeBadge}>{zone.type} hosted zone</span>
          </div>
          <div className={styles.metadataGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Hosted zone ID</span>
              <span className={styles.metaValue}>{zone.id}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Record count</span>
              <span className={styles.metaValue}>{zone.record_count}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Description</span>
              <span className={styles.metaValue}>{zone.description || "-"}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Comment</span>
              <span className={styles.metaValue}>{zone.comment || "-"}</span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.recordsTableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Records <span className={styles.count}>({records.length})</span></h3>
          <div className={styles.buttonGroup}>
            <button
              onClick={() => selectedRecord && setEditRecordId(selectedRecord.id)}
              className="btn-secondary"
              disabled={!selectedRecord}
              style={{
                opacity: selectedRecord ? 1 : 0.5,
                cursor: selectedRecord ? "pointer" : "not-allowed",
              }}
            >
              Edit record
            </button>
            <button
              onClick={handleDelete}
              className="btn-secondary"
              disabled={!selectedRecord || isSystemRecord(selectedRecord)}
              style={{
                opacity: selectedRecord && !isSystemRecord(selectedRecord) ? 1 : 0.5,
                cursor: selectedRecord && !isSystemRecord(selectedRecord) ? "pointer" : "not-allowed",
                marginLeft: "10px"
              }}
            >
              Delete record
            </button>
            <button onClick={() => setCreateDrawerOpen(true)} className="btn-primary" style={{ marginLeft: "10px" }}>
              Create record
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
              placeholder="Find records by name"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCol} />
                <th>Record name</th>
                <th>Type</th>
                <th>Routing policy</th>
                <th>TTL (seconds)</th>
                <th>Value/Route traffic to</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.loadingCell}>
                    <div className={styles.spinner} />
                    <span>Loading DNS records...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    No records found matching your search.
                  </td>
                </tr>
              ) : (
                records
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((rec) => {
                    const isSelected = selectedRecord?.id === rec.id;
                    const systemRecord = isSystemRecord(rec);
                    return (
                      <tr
                        key={rec.id}
                        className={`${styles.row} ${isSelected ? styles.selectedRow : ""}`}
                        onClick={() => setSelectedRecord(isSelected ? null : rec)}
                      >
                        <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => setSelectedRecord(isSelected ? null : rec)}
                          />
                        </td>
                        <td className={styles.recordName}>
                          {rec.name}
                          {systemRecord && <span className={styles.systemTag}>System</span>}
                        </td>
                        <td>
                          <span className={styles.typeBadgeSmall}>{rec.type}</span>
                        </td>
                        <td>{rec.routing_policy}</td>
                        <td>{rec.ttl}</td>
                        <td className={styles.valueCell}>{rec.value}</td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AWSPagination
        currentPage={currentPage}
        totalItems={records.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {createDrawerOpen && zone && (
        <CreateRecordDrawer
          zoneId={zoneId}
          zoneName={zone.name}
          onClose={() => setCreateDrawerOpen(false)}
          onSuccess={() => {
            fetchData();
            setNotification({ type: "success", message: "Successfully created DNS record." });
          }}
        />
      )}

      {editRecordId !== null && zone && (
        <EditRecordDrawer
          zoneId={zoneId}
          zoneName={zone.name}
          recordId={editRecordId}
          onClose={() => setEditRecordId(null)}
          onSuccess={() => {
            setSelectedRecord(null);
            fetchData();
            setNotification({ type: "success", message: "Successfully updated DNS record." });
          }}
        />
      )}

      <AWSModal
        title="Delete DNS record"
        isOpen={isDeleteModalOpen}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={executeDelete}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <p>
          Are you sure you want to delete the record <strong>{selectedRecord?.name}</strong> of type <strong>{selectedRecord?.type}</strong>?
          This action cannot be undone.
        </p>
      </AWSModal>
    </div>
  );
}
