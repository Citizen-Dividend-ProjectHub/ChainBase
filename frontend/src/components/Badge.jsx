const MAP = {
  confirmed: 'badge-green',
  completed: 'badge-green',
  active:    'badge-green',
  eligible:  'badge-green',
  pending:   'badge-yellow',
  processing:'badge-yellow',
  failed:    'badge-red',
  ineligible:'badge-red',
  cancelled: 'badge-gray',
  draft:     'badge-gray',
  queued:    'badge-blue',
}

export default function Badge({ status }) {
  const cls = MAP[status?.toLowerCase()] ?? 'badge-gray'
  return <span className={`badge ${cls}`}>{status}</span>
}
