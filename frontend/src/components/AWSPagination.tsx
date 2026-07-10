"use client";

import React from "react";
import styles from "./AWSPagination.module.css";

interface AWSPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function AWSPagination({ currentPage, totalItems, itemsPerPage, onPageChange }: AWSPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={styles.container}>
      <span className={styles.displayInfo}>
        Displaying {startItem}-{endItem} of {totalItems}
      </span>
      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${styles.navButton} ${currentPage === 1 ? styles.disabled : ""}`}
          aria-label="Previous page"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <span className={styles.pageIndicator}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${styles.navButton} ${currentPage === totalPages ? styles.disabled : ""}`}
          aria-label="Next page"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
