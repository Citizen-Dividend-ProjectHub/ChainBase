import { useState } from 'react'

export default function CardAddressForm({ onSubmit, submitting, err }) {
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(`${street}, ${city}, ${state} ${zip}`.trim())
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Street address</label>
        <input required placeholder="123 Main St" value={street} onChange={e => setStreet(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="form-group" style={{ flex: 2 }}>
          <label>City</label>
          <input required placeholder="Springfield" value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>State</label>
          <input required placeholder="CA" maxLength={2} value={state} onChange={e => setState(e.target.value.toUpperCase())} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>ZIP</label>
          <input required placeholder="94103" value={zip} onChange={e => setZip(e.target.value)} />
        </div>
      </div>
      {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <button type="submit" className="btn btn-green" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
        {submitting ? 'Saving…' : 'Save address'}
      </button>
    </form>
  )
}
