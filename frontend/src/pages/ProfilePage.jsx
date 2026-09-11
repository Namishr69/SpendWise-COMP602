import { useContext, useEffect, useState } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import { AuthContext } from '../context/authContext.js'
import { getMyProfile, updateMyProfile } from '../api/userApi.js'
import './ProfilePage.css'

function ProfilePage() {
  const { currentUser } = useContext(AuthContext)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setLoadError('')

      try {
        const data = await getMyProfile()
        if (!active) return

        setProfile(data)
        setFirstName(data.firstName ?? '')
        setLastName(data.lastName ?? '')
      } catch (error) {
        if (active) setLoadError(error.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  function startEditing() {
    setFirstName(profile?.firstName ?? '')
    setLastName(profile?.lastName ?? '')
    setFieldError('')
    setMessage('')
    setIsEditing(true)
  }

  function cancelEditing() {
    setFirstName(profile?.firstName ?? '')
    setLastName(profile?.lastName ?? '')
    setFieldError('')
    setIsEditing(false)
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
      })

      setProfile(updated)
      setFirstName(updated.firstName ?? '')
      setLastName(updated.lastName ?? '')
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
                {initials || '👤'}
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
