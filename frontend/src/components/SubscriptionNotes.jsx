import { useState } from 'react'
import Card from './ui/Card'
import Button from './ui/Button'
import './SubscriptionNotes.css'

const MAX_LENGTH = 500

function SubscriptionNotes({ notes, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  function startEditing(initialValue) {
    setDraft(initialValue || '')
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setDraft('')
  }

  async function save() {
    setSaving(true)
    try {
      await onSave(draft.trim())
      setEditing(false)
      setDraft('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await onDelete()
      setEditing(false)
      setDraft('')
    } finally {
      setSaving(false)
    }
  }

  const hasNote = notes && notes.trim().length > 0

  if (editing) {
    return (
      <Card className="sub-notes">
        <div className="sub-notes__header">
          <h2>Notes</h2>
        </div>

        <div className="sub-notes__editor">
          <textarea
            className="sub-notes__textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Add a personal note... (e.g. &quot;shared with roommate&quot;, &quot;cancel after March&quot;)"
            rows={4}
            maxLength={MAX_LENGTH}
            autoFocus
            disabled={saving}
          />
          <div className="sub-notes__footer">
            <span className="sub-notes__counter">
              {draft.length}/{MAX_LENGTH}
            </span>
            <div className="sub-notes__actions">
              <Button variant="secondary" onClick={cancel} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={save}
                disabled={saving || draft.trim().length === 0}
              >
                {saving ? 'Saving...' : 'Save note'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="sub-notes">
      <div className="sub-notes__header">
        <h2>Notes</h2>
        {hasNote && (
          <div className="sub-notes__header-actions">
            <button
              className="sub-notes__icon-btn sub-notes__icon-btn--edit"
              onClick={() => startEditing(notes)}
              title="Edit note"
            >
              Edit
            </button>
            <button
              className="sub-notes__icon-btn sub-notes__icon-btn--delete"
              onClick={handleDelete}
              title="Delete note"
              disabled={saving}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {hasNote ? (
        <p className="sub-notes__content">{notes}</p>
      ) : (
        <div className="sub-notes__empty">
          <div className="sub-notes__empty-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="6" width="24" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <line x1="13" y1="14" x2="27" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="13" y1="19" x2="24" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="13" y1="24" x2="21" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="sub-notes__empty-text">No notes yet</p>
          <p className="sub-notes__empty-hint">Add a personal note to keep context about this subscription</p>
          <Button variant="secondary" onClick={() => startEditing('')}>
            Add a note
          </Button>
        </div>
      )}
    </Card>
  )
}

export default SubscriptionNotes
