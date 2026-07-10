"use client";

import React, { useState } from "react";
import styles from "./AWSModal.module.css";

interface AWSModalProps {
  title: string;
  isOpen: boolean;
  confirmTextRequired?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function AWSModal({
  title,
  isOpen,
  confirmTextRequired,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  children
}: AWSModalProps) {
  const [typedConfirm, setTypedConfirm] = useState("");

  if (!isOpen) return null;

  const isConfirmedDisabled = confirmTextRequired
    ? typedConfirm.trim().toLowerCase() !== confirmTextRequired.toLowerCase()
    : false;

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmedDisabled) return;
    onConfirm();
    setTypedConfirm("");
  };

  const handleClose = () => {
    setTypedConfirm("");
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeButton} onClick={handleClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleConfirmSubmit}>
          <div className={styles.body}>
            {children}

            {confirmTextRequired && (
              <div className={styles.confirmTextSection}>
                <label htmlFor="confirmBox" className={styles.confirmLabel}>
                  To confirm this action, type <strong>{confirmTextRequired}</strong> in the box below.
                </label>
                <input
                  id="confirmBox"
                  type="text"
                  className="form-input"
                  placeholder={confirmTextRequired}
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className="btn-secondary" onClick={handleClose}>
              {cancelLabel}
            </button>
            <button
              type="submit"
              className={`btn-primary ${styles.confirmBtn}`}
              disabled={isConfirmedDisabled}
              style={{
                backgroundColor: isConfirmedDisabled ? "#eaeded" : "#d13212",
                borderColor: isConfirmedDisabled ? "#eaeded" : "#d13212",
                color: isConfirmedDisabled ? "#aab7b8" : "#ffffff",
                cursor: isConfirmedDisabled ? "not-allowed" : "pointer"
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
