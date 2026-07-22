export default function VerificationModal({ verificationUrl, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <div className="modal-title">Verify your identity</div>
        <iframe src={verificationUrl} className="modal-iframe" title="Identity verification" />
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Continue in background</button>
        </div>
      </div>
    </div>
  )
}
