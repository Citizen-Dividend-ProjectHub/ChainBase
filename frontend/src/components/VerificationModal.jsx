export default function VerificationModal({ verificationUrl, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-title">Verify your identity</div>
        <iframe src={verificationUrl} className="modal-iframe" title="Identity verification" />
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Why verification?</button>
        </div>
      </div>
    </div>
  )
}
