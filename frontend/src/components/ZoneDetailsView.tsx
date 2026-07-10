"use client";

import React, { useEffect, useState } from "react";
import styles from "./ZoneDetailsView.module.css";
import CreateRecordDrawer from "./CreateRecordDrawer";
import EditRecordDrawer from "./EditRecordDrawer";
import ImportRecordsDrawer from "./ImportRecordsDrawer";
import ExportZoneModal from "./ExportZoneModal";
import AWSPagination from "./AWSPagination";
import AWSModal from "./AWSModal";
import AWSNotification from "./AWSNotification";
import { API_URL } from "../config";

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
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<number>>(new Set());
  const selectedRecords = records.filter(r => selectedRecordIds.has(r.id));
  const selectedRecord = selectedRecords.length === 1 ? selectedRecords[0] : null;
  const hasSystemRecordSelected = selectedRecords.some(r => (r.type === "NS" || r.type === "SOA") && zone && r.name === zone.name);
  const canDelete = selectedRecordIds.size > 0 && !hasSystemRecordSelected;
  const canEdit = selectedRecordIds.size === 1;

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
      const zoneRes = await fetch(`${API_URL}/api/zones/${zoneId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!zoneRes.ok) throw new Error("Failed to load hosted zone metadata.");
      const zoneData = await zoneRes.json();
      setZone(zoneData);

      // Fetch Records
      const recordsUrl = searchQuery
        ? `${API_URL}/api/zones/${zoneId}/records?name=${encodeURIComponent(searchQuery)}`
        : `${API_URL}/api/zones/${zoneId}/records`;
      
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
    if (selectedRecordIds.size === 0) return;
    
    // Safety check: block UI delete for NS/SOA
    if (hasSystemRecordSelected) {
      setNotification({
        type: "error",
        message: "Default NS and SOA records are required for hosted zone routing and cannot be deleted."
      });
      return;
    }

    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (selectedRecordIds.size === 0) return;
    const recordsCountToDelete = selectedRecordIds.size;

    try {
      const token = localStorage.getItem("route53_token");
      const response = await fetch(`${API_URL}/api/zones/${zoneId}/records/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ record_ids: Array.from(selectedRecordIds) })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to delete records.");
      }

      setSelectedRecordIds(new Set());
      setIsDeleteModalOpen(false);
      fetchData();
      setNotification({
        type: "success",
        message: `Successfully deleted ${recordsCountToDelete} DNS record(s).`
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "An error occurred during deletion."
      });
      setIsDeleteModalOpen(false);
    }
  };

  const handleToggleRow = (id: number) => {
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const paginatedRecords = records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleToggleAll = () => {
    const visibleIds = paginatedRecords.map(r => r.id);
    const allVisibleSelected = visibleIds.every(id => selectedRecordIds.has(id));

    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const isAllVisibleSelected = paginatedRecords.length > 0 && paginatedRecords.every(r => selectedRecordIds.has(r.id));
  const isSomeVisibleSelected = paginatedRecords.some(r => selectedRecordIds.has(r.id)) && !isAllVisibleSelected;

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
              disabled={!canEdit}
              style={{
                opacity: canEdit ? 1 : 0.5,
                cursor: canEdit ? "pointer" : "not-allowed",
              }}
            >
              Edit record
            </button>
            <button
              onClick={handleDelete}
              className="btn-secondary"
              disabled={!canDelete}
              style={{
                opacity: canDelete ? 1 : 0.5,
                cursor: canDelete ? "pointer" : "not-allowed",
                marginLeft: "10px"
              }}
            >
              {selectedRecordIds.size > 1 ? `Delete ${selectedRecordIds.size} records` : "Delete record"}
            </button>
            <button onClick={() => setImportDrawerOpen(true)} className="btn-secondary" style={{ marginLeft: "10px" }}>
              Import records
            </button>
            <button onClick={() => setIsExportModalOpen(true)} className="btn-secondary" style={{ marginLeft: "10px" }}>
              Export zone
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
                <th className={styles.checkboxCol}>
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = isSomeVisibleSelected;
                      }
                    }}
                    onChange={handleToggleAll}
                  />
                </th>
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
                    const isSelected = selectedRecordIds.has(rec.id);
                    const systemRecord = isSystemRecord(rec);
                    return (
                      <tr
                        key={rec.id}
                        className={`${styles.row} ${isSelected ? styles.selectedRow : ""}`}
                        onClick={() => handleToggleRow(rec.id)}
                      >
                        <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(rec.id)}
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
          setSelectedRecordIds(new Set());
          fetchData();
          setNotification({ type: "success", message: "Successfully updated DNS record." });
        }}
      />
      )}

      {importDrawerOpen && (
        <ImportRecordsDrawer
          zoneId={zoneId}
          onClose={() => setImportDrawerOpen(false)}
          onSuccess={(count) => {
            fetchData();
            setNotification({ type: "success", message: `Successfully imported ${count} records from BIND zone file.` });
          }}
        />
      )}

      {isExportModalOpen && zone && (
        <ExportZoneModal
          zoneId={zoneId}
          zoneName={zone.name}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onSuccess={() => {
            setNotification({ type: "success", message: "Hosted zone records exported successfully." });
          }}
        />
      )}

      <AWSModal
        title={selectedRecordIds.size > 1 ? "Delete DNS records" : "Delete DNS record"}
        isOpen={isDeleteModalOpen}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={executeDelete}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        {selectedRecordIds.size > 1 ? (
          <p>
            Are you sure you want to delete the selected <strong>{selectedRecordIds.size}</strong> records?
            This action cannot be undone.
          </p>
        ) : (
          <p>
            Are you sure you want to delete the record <strong>{selectedRecord?.name}</strong> of type <strong>{selectedRecord?.type}</strong>?
            This action cannot be undone.
          </p>
        )}
      </AWSModal>
    </div>
  );
}
