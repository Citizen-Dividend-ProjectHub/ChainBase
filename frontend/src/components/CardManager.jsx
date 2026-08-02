import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import VirtualCard from './VirtualCard'
import CardAddressForm from './CardAddressForm'
import Toggle from './Toggle'

function ReissueCardModal({ onConfirm, onClose, submitting, err }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Request a new card?</div>
        <p style={{ fontSize: 14, color: 'var(--cb-muted)', marginBottom: 20, lineHeight: 1.5 }}>
          Your current card will be deactivated immediately and can no longer be used. A replacement
          takes time to process, so you won't be able to request another new card for 30 days.
        </p>
        {err && <p style={{ color: 'var(--cb-red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-red" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Requesting…' : 'Yes, deactivate and request new card'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Self-contained: fetches its own copy of the recipient profile so it can be
// dropped into any page (Dashboard, Wallet settings) without that page having
// to thread card state through. totalReceived is optional — only Dashboard
// already has it computed from disbursements it fetches anyway.
export default function CardManager({ token, userId, userName, totalReceived }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [requestingCard, setRequestingCard] = useState(false)
  const [cardErr, setCardErr] = useState('')
  const [showCardAddressForm, setShowCardAddressForm] = useState(false)
  const [lockSubmitting, setLockSubmitting] = useState(false)
  const [lockErr, setLockErr] = useState('')
  const [showReissueModal, setShowReissueModal] = useState(false)
  const [reissueSubmitting, setReissueSubmitting] = useState(false)
  const [reissueErr, setReissueErr] = useState('')

  useEffect(() => {
    if (!userId) return
    apiFetch(`/recipients/${userId}`, {}, token)
      .then(setProfile)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [token, userId])

  async function requestCard(mailing_address) {
    setCardErr('')
    setRequestingCard(true)
    try {
      const updated = await apiFetch('/auth/recipient/card', {
        method: 'POST',
        body: JSON.stringify({ mailing_address }),
      }, token)
      setProfile(p => ({ ...p, card_requested_at: updated.card_requested_at }))
      setShowCardAddressForm(false)
    } catch (e) {
      setCardErr(e.message)
    } finally {
      setRequestingCard(false)
    }
  }

  async function toggleCardLock(locked) {
    setLockErr('')
    setLockSubmitting(true)
    try {
      const updated = await apiFetch('/auth/recipient/card/lock', {
        method: 'PUT',
        body: JSON.stringify({ locked }),
      }, token)
      setProfile(p => ({ ...p, card_locked: updated.card_locked }))
    } catch (e) {
      setLockErr(e.message)
    } finally {
      setLockSubmitting(false)
    }
  }

  async function confirmReissueCard() {
    setReissueErr('')
    setReissueSubmitting(true)
    try {
      const updated = await apiFetch('/auth/recipient/card/reissue', { method: 'POST' }, token)
      setProfile(p => ({
        ...p,
        card_locked: updated.card_locked,
        card_reissue_requested_at: updated.card_reissue_requested_at,
      }))
      setShowReissueModal(false)
    } catch (e) {
      setReissueErr(e.message)
    } finally {
      setReissueSubmitting(false)
    }
  }

  if (loading) return <div className="empty">Loading…</div>
  if (err) return <p style={{ color: 'var(--cb-red)', fontSize: 13 }}>Error: {err}</p>

  const wallet = profile?.wallet_address ?? ''
  const reissueCooldownActive = profile?.card_reissue_requested_at
    ? (Date.now() - new Date(profile.card_reissue_requested_at).getTime()) < 30 * 24 * 60 * 60 * 1000
    : false
  const reissueEligibleDate = profile?.card_reissue_requested_at
    ? new Date(new Date(profile.card_reissue_requested_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null

  return (
    <>
      {profile?.card_requested_at ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <VirtualCard address={wallet} name={userName} locked={profile.card_locked} />
          <div style={{ fontSize: 13.5, color: 'var(--cb-muted)', maxWidth: 280 }}>
            Spend your USDC balance directly with this card, linked to your wallet address above.
            {totalReceived != null && (
              <>
                <div className="tabular" style={{ marginTop: 10, fontSize: 22, fontWeight: 700, color: 'var(--cb-text)' }}>
                  ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--cb-muted2)', marginBottom: 16 }}>Available balance</div>
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', marginTop: totalReceived == null ? 16 : 0, borderTop: '1px solid var(--cb-border)' }}>
              <div>
                <div style={{ fontSize: 13.5, color: 'var(--cb-text)' }}>Lock card</div>
                <div style={{ fontSize: 11.5, color: 'var(--cb-muted2)' }}>Blocks new purchases immediately.</div>
              </div>
              <Toggle
                checked={!!profile.card_locked}
                disabled={lockSubmitting || reissueCooldownActive}
                onChange={toggleCardLock}
              />
            </div>
            {lockErr && <p style={{ color: 'var(--cb-red)', fontSize: 12, marginTop: 4 }}>{lockErr}</p>}

            {reissueCooldownActive ? (
              <p style={{ fontSize: 12, color: 'var(--cb-muted2)', marginTop: 8 }}>
                A new card was recently requested. You can request another after{' '}
                {reissueEligibleDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowReissueModal(true)}
                style={{ marginTop: 8 }}
              >
                Request a new card
              </button>
            )}
          </div>
        </div>
      ) : showCardAddressForm ? (
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 13, color: 'var(--cb-muted)', marginBottom: 12 }}>
            We'll save this mailing address for ChainBase's card program, so it's ready when physical
            cards become available.
          </div>
          <CardAddressForm onSubmit={requestCard} submitting={requestingCard} err={cardErr} />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowCardAddressForm(false)}
            style={{ marginTop: 8 }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13.5, color: 'var(--cb-muted)' }}>
            Get a ChainBase card to spend your USDC balance directly.
          </div>
          <button className="btn btn-green btn-sm" onClick={() => setShowCardAddressForm(true)}>
            Get your ChainBase Card
          </button>
        </div>
      )}

      {showReissueModal && (
        <ReissueCardModal
          onConfirm={confirmReissueCard}
          onClose={() => setShowReissueModal(false)}
          submitting={reissueSubmitting}
          err={reissueErr}
        />
      )}
    </>
  )
}
