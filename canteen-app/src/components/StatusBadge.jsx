/**
 * StatusBadge — displays a coloured pill for order status.
 * Usage: <StatusBadge status="pending" />
 * Supported statuses: pending | preparing | ready | delivered | cancelled
 */
const STATUS_STYLES = {
  pending: { background: '#FFF3CD', color: '#856404' },
  preparing: { background: '#CCE5FF', color: '#004085' },
  ready: { background: '#D4EDDA', color: '#155724' },
  delivered: { background: '#E2E3E5', color: '#383D41' },
  cancelled: { background: '#F8D7DA', color: '#721C24' },
};

function StatusBadge({ status = 'pending' }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  return (
    <span
      style={{
        ...style,
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        display: 'inline-block',
      }}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
