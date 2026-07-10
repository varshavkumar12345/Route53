"use client";

import React from "react";
import styles from "./AWSNotification.module.css";

interface AWSNotificationProps {
  type: "success" | "error" | "info";
  message: string;
  onDismiss: () => void;
}

export default function AWSNotification({ type, message, onDismiss }: AWSNotificationProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#1d8102">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        );
      case "error":
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#d91414">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#0073bb">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        );
    }
  };

  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      <div className={styles.iconContainer}>{getIcon()}</div>
      <div className={styles.message}>{message}</div>
      <button className={styles.dismissButton} onClick={onDismiss} aria-label="Dismiss">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  );
}
