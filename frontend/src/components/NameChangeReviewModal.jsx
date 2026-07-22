const FIELD_LABELS = {
  first_name: 'First name',
  last_name: 'Last name',
  date_of_birth: 'Date of birth',
  document_number: 'Document number',
  issuing_state: 'Issuing state',
}

function parseDetails(details) {
  if (!details) return {}
  try {
    return JSON.parse(details)
  } catch {
    return {}
  }
}

export default function NameChangeReviewModal({ recipient, onResolve, onClose }) {
  const oldData = parseDetails(recipient.verification_details)
  const newData = parseDetails(recipient.pending_verification_details)
  const fields = Object.keys(FIELD_LABELS).filter(f => oldData[f] != null || newData[f] != null)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-title">Review legal document change — {recipient.full_name}</div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>Field</th><th>On file</th><th>Submitted</th></tr>
            </thead>
            <tbody>
              {fields.map(f => {
                const changed = (oldData[f] ?? '') !== (newData[f] ?? '')
                return (
                  <tr key={f}>
                    <td className="td-muted">{FIELD_LABELS[f]}</td>
                    <td style={changed ? { color: 'var(--yellow)' } : undefined}>{oldData[f] ?? '—'}</td>
                    <td style={changed ? { color: 'var(--yellow)', fontWeight: 600 } : undefined}>{newData[f] ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-red" onClick={() => onResolve('reject')}>Reject</button>
          <button type="button" className="btn btn-green" onClick={() => onResolve('approve')}>Approve</button>
        </div>
      </div>
    </div>
  )
}
