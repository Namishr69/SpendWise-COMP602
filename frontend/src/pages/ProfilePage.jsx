import { useContext, useEffect, useRef, useState } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import { updateMyProfile } from '../api/userApi.js'
import { ProfileContext } from '../context/ProfileProvider.jsx'
import { resizeImageToDataUrl } from '../utils/image.js'
import './ProfilePage.css'

function ProfilePage() {
  const { profile, setProfile, loading, error: loadError } =
    useContext(ProfileContext)

  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fileInputRef = useRef(null)

  // Keep the edit fields in sync with the loaded profile while not editing,
  // so the avatar and inputs reflect the latest saved values.
  useEffect(() => {
    if (profile && !isEditing) {
      setFirstName(profile.firstName ?? '')
      setLastName(profile.lastName ?? '')
      setPhotoURL(profile.photoURL ?? '')
    }
  }, [profile, isEditing])

  function startEditing() {
    setFirstName(profile?.firstName ?? '')
    setLastName(profile?.lastName ?? '')
    setPhotoURL(profile?.photoURL ?? '')
    setFieldError('')
    setMessage('')
    setIsEditing(true)
  }

  function cancelEditing() {
    setFirstName(profile?.firstName ?? '')
    setLastName(profile?.lastName ?? '')
    setPhotoURL(profile?.photoURL ?? '')
    setFieldError('')
    setIsEditing(false)
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    // Reset so picking the same file again still fires onChange.
    event.target.value = ''
    if (!file) return

    setFieldError('')

    if (!file.type.startsWith('image/')) {
      setFieldError('Please choose an image file.')
      return
    }

    try {
      const dataUrl = await resizeImageToDataUrl(file)
      setPhotoURL(dataUrl)
    } catch (error) {
      setFieldError(error.message)
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    setFieldError('')
    setMessage('')

    if (!firstName.trim() || !lastName.trim()) {
      setFieldError('First and last name are required.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        photoURL,
      })

      setProfile(updated)
      setFirstName(updated.firstName ?? '')
      setLastName(updated.lastName ?? '')
      setPhotoURL(updated.photoURL ?? '')
      setIsEditing(false)
      setMessage('Profile updated')
    } catch (error) {
      setFieldError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(' ')

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('')

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <AppShell activeNav="Profile">
      <Card>
        {loading && <p className="profile-status">Loading profile…</p>}

        {!loading && loadError && (
          <p className="profile-status profile-status--error">{loadError}</p>
        )}

        {!loading && !loadError && profile && (
          <>
            <div className="profile-header">
              <div className="profile-avatar" aria-hidden="true">
                {photoURL ? (
                  <img
                    className="profile-avatar-img"
                    src={photoURL}
                    alt=""
                  />
                ) : (
                  initials || '👤'
                )}
              </div>

              <div>
                <h2 className="profile-name">
                  {fullName || 'Your profile'}
                </h2>
                <p className="profile-email">{profile.email}</p>
                {memberSince && (
                  <p className="profile-member-since">
                    Member since {memberSince}
                  </p>
                )}
              </div>
            </div>

            {!isEditing ? (
              <div className="profile-details">
                <div className="profile-detail">
                  <span className="profile-detail-label">First name</span>
                  <span className="profile-detail-value">
                    {profile.firstName || '—'}
                  </span>
                </div>

                <div className="profile-detail">
                  <span className="profile-detail-label">Last name</span>
                  <span className="profile-detail-value">
                    {profile.lastName || '—'}
                  </span>
                </div>

                <div className="profile-detail">
                  <span className="profile-detail-label">Email</span>
                  <span className="profile-detail-value">{profile.email}</span>
                </div>

                {message && <p className="profile-message">{message}</p>}

                <div className="profile-actions">
                  <Button onClick={startEditing}>Edit profile</Button>
                </div>
              </div>
            ) : (
              <form className="profile-form" onSubmit={handleSave}>
                <div className="profile-photo-controls">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handlePhotoChange}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    {photoURL ? 'Change photo' : 'Upload photo'}
                  </Button>
                  {photoURL && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPhotoURL('')}
                      disabled={saving}
                    >
                      Remove photo
                    </Button>
                  )}
                </div>

                <Input
                  id="profile-first-name"
                  label="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={saving}
                />

                <Input
                  id="profile-last-name"
                  label="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={saving}
                  error={fieldError}
                />

                <div className="profile-form-field">
                  <label className="profile-form-label" htmlFor="profile-email">
                    Email
                  </label>
                  <Input
                    id="profile-email"
                    value={profile.email}
                    disabled
                    readOnly
                  />
                  <p className="profile-form-hint">
                    Email is tied to your sign-in and can't be changed here.
                  </p>
                </div>

                <div className="profile-actions">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </Card>
    </AppShell>
  )
}

export default ProfilePage
