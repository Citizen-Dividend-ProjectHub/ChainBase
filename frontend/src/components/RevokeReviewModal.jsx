export default function RevokeReviewModal({ request, canReview, onResolve, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Revoke request — {request.recipient_name}</div>
        <div className="form-group">
          <label>Requested by</label>
          <div style={{ fontSize: 14, color: 'var(--cb-text)' }}>{request.requested_by_name ?? 'Unknown admin'}</div>
        </div>
        <div className="form-group">
          <label>Reason</label>
          <div style={{ fontSize: 14, color: 'var(--cb-text)', whiteSpace: 'pre-wrap' }}>{request.reason}</div>
        </div>
        {!canReview && (
          <p style={{ fontSize: 12.5, color: 'var(--cb-muted)', marginBottom: 12 }}>
            You requested this revocation, so another admin needs to approve or deny it.
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          {canReview && (
            <>
              <button type="button" className="btn btn-green" onClick={() => onResolve('deny')}>Deny</button>
              <button type="button" className="btn btn-red" onClick={() => onResolve('approve')}>Approve</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
