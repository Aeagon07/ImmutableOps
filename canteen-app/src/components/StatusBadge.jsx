import React from 'react';
import { Clock, ChefHat, CheckCircle2, Check, Zap, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  queued:    { bg: '#E6F1FB', color: '#185FA5', border: '#BFDBFE', label: 'Queued', icon: Clock },
  preparing: { bg: '#FAEEDA', color: '#854F0B', border: '#FCD38A', label: 'Preparing', icon: ChefHat },
  ready:     { bg: '#FFF0E5', color: '#111827', border: '#FDBA74', label: 'Ready', icon: CheckCircle2 },
  done:      { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB', label: 'Done', icon: Check },
  urgent:    { bg: '#FCEBEB', color: '#A32D2D', border: '#FCA5A5', label: 'Urgent', icon: AlertTriangle },
  high:      { bg: '#FAEEDA', color: '#854F0B', border: '#FCD38A', label: 'High', icon: AlertCircle },
  normal:    { bg: '#FFF0E5', color: '#FC8019', border: '#FDBA74', label: 'Normal', icon: Zap },
};

export default function StatusBadge({ status, labelOverride }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.normal;
  const Icon = cfg.icon;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '20px',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {labelOverride || cfg.label}
    </motion.span>
  );
}
