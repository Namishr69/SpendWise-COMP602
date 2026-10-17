import { useState } from 'react'

import Card from './ui/Card'
import Button from './ui/Button'
import { useTranslations } from '../hooks/useTranslations.js'

import './SubscriptionNotes.css'

const MAX_LENGTH = 500
const WARN_AT = 400

const SUBSCRIPTION_NOTES_TEXT = [
  'Notes',
  'Add a personal note...',
  'characters remaining',
  'Cancel',
  'Saving...',
  'Save note',
  'Saved',
  'Edit note',
  'Edit',
  'Delete note?',
  'Deleting...',
  'Yes, delete',
  'No',
  'Delete note',
  'Delete',
  'Click to edit',
  'No notes yet',
  'Keep personal context alongside this subscription, reminders, details about who uses it, or when to cancel.',
  'Add a note',
]

function SubscriptionNotes({
  notes,
  onSave,
  onDelete,
}) {
  const [
    notesText,
    placeholderText,
    charactersRemainingText,
    cancelText,
    savingText,
    saveNoteText,
    savedText,
    editNoteText,
    editText,
    deleteNoteQuestionText,
    deletingText,
    yesDeleteText,
    noText,
    deleteNoteText,
    deleteText,
    clickToEditText,
    noNotesText,
    emptyHintText,
    addNoteText,
  ] = useTranslations(
    SUBSCRIPTION_NOTES_TEXT,
  )

  const [editing, setEditing] =
    useState(false)

  const [draft, setDraft] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const [
    confirmDelete,
    setConfirmDelete,
  ] = useState(false)

  const [
    justSaved,
    setJustSaved,
  ] = useState(false)

  function startEditing(initialValue) {
    setDraft(initialValue || '')
    setEditing(true)
    setConfirmDelete(false)
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
      setJustSaved(true)

      setTimeout(
        () => setJustSaved(false),
        2000,
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setSaving(true)

    try {
      await onDelete()

      setEditing(false)
      setDraft('')
      setConfirmDelete(false)
    } finally {
      setSaving(false)
    }
  }

  const hasNote =
    notes &&
    notes.trim().length > 0

  const remaining =
    MAX_LENGTH - draft.length

  const counterClass =
    remaining <= 0
      ? 'sub-notes__counter sub-notes__counter--danger'
      : remaining <=
          MAX_LENGTH - WARN_AT
        ? 'sub-notes__counter sub-notes__counter--warn'
        : 'sub-notes__counter'

  if (editing) {
    return (
      <Card className="sub-notes">
        <div className="sub-notes__header">
          <h2>{notesText}</h2>
        </div>

        <div className="sub-notes__editor sub-notes--fade-in">
          <textarea
            className="sub-notes__textarea"
            value={draft}
            onChange={(event) =>
              setDraft(
                event.target.value.slice(
                  0,
                  MAX_LENGTH,
                ),
              )
            }
            placeholder={placeholderText}
            rows={4}
            maxLength={MAX_LENGTH}
            autoFocus
            disabled={saving}
          />

          <div className="sub-notes__footer">
            <span className={counterClass}>
              {remaining}{' '}
              {charactersRemainingText}
            </span>

            <div className="sub-notes__actions">
              <Button
                variant="secondary"
                onClick={cancel}
                disabled={saving}
              >
                {cancelText}
              </Button>

              <Button
                variant="primary"
                onClick={save}
                disabled={
                  saving ||
                  draft.trim().length === 0
                }
              >
                {saving
                  ? savingText
                  : saveNoteText}
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
        <h2>{notesText}</h2>

        {hasNote && (
          <div className="sub-notes__header-actions">
            {justSaved && (
              <span className="sub-notes__saved-badge sub-notes--fade-in">
                {savedText}
              </span>
            )}

            <button
              className="sub-notes__icon-btn sub-notes__icon-btn--edit"
              onClick={() =>
                startEditing(notes)
              }
              title={editNoteText}
            >
              {editText}
            </button>

            {confirmDelete ? (
              <div className="sub-notes__confirm-group sub-notes--fade-in">
                <span className="sub-notes__confirm-label">
                  {deleteNoteQuestionText}
                </span>

                <button
                  className="sub-notes__icon-btn sub-notes__icon-btn--delete"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {saving
                    ? deletingText
                    : yesDeleteText}
                </button>

                <button
                  className="sub-notes__icon-btn sub-notes__icon-btn--edit"
                  onClick={() =>
                    setConfirmDelete(false)
                  }
                >
                  {noText}
                </button>
              </div>
            ) : (
              <button
                className="sub-notes__icon-btn sub-notes__icon-btn--delete"
                onClick={handleDelete}
                title={deleteNoteText}
                disabled={saving}
              >
                {deleteText}
              </button>
            )}
          </div>
        )}
      </div>

      {hasNote ? (
        <div
          className="sub-notes__content-wrap sub-notes--fade-in"
          onClick={() =>
            startEditing(notes)
          }
        >
          <p className="sub-notes__content">
            {notes}
          </p>

          <span className="sub-notes__edit-hint">
            {clickToEditText}
          </span>
        </div>
      ) : (
        <div className="sub-notes__empty sub-notes--fade-in">
          <div className="sub-notes__empty-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="10"
                y="7"
                width="28"
                height="34"
                rx="4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />

              <line
                x1="16"
                y1="16"
                x2="32"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <line
                x1="16"
                y1="22"
                x2="29"
                y2="22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <line
                x1="16"
                y1="28"
                x2="25"
                y2="28"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <circle
                cx="34"
                cy="34"
                r="8"
                fill="var(--color-cream)"
                stroke="currentColor"
                strokeWidth="1.5"
              />

              <line
                x1="34"
                y1="30"
                x2="34"
                y2="38"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <line
                x1="30"
                y1="34"
                x2="38"
                y2="34"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="sub-notes__empty-text">
            {noNotesText}
          </p>

          <p className="sub-notes__empty-hint">
            {emptyHintText}
          </p>

          <Button
            variant="secondary"
            onClick={() =>
              startEditing('')
            }
          >
            {addNoteText}
          </Button>
        </div>
      )}
    </Card>
  )
}

export default SubscriptionNotes