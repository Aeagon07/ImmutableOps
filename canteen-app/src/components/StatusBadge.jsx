import React from 'react';

const STATUS_CONFIG = {
  queued:    { bg: '#E6F1FB', color: '#185FA5', border: '#BFDBFE', label: 'Queued' },
  preparing: { bg: '#FAEEDA', color: '#854F0B', border: '#FCD38A', label: 'Preparing' },
  ready:     { bg: '#E1F5EE', color: '#085041', border: '#5DCAA5', label: 'Ready' },
  done:      { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB', label: 'Done' },
  urgent:    { bg: '#FCEBEB', color: '#A32D2D', border: '#FCA5A5', label: 'Urgent' },
  high:      { bg: '#FAEEDA', color: '#854F0B', border: '#FCD38A', label: 'High' },
  normal:    { bg: '#E1F5EE', color: '#1D9E75', border: '#5DCAA5', label: 'Normal' },
};

export default function StatusBadge({ status, labelOverride }) {
  const cfg = STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.normal;
  
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: '11px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '20px',
        whiteSpace: 'nowrap',
        display: 'inline-block'
      }}
    >
      {labelOverride || cfg.label}
    </span>
  );
}
