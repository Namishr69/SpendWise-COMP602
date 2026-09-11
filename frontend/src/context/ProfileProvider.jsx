import { createContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase.js'
import { getMyProfile } from '../api/userApi.js'

export const ProfileContext = createContext()

function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setProfile(null)
          setError('')
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setLoading(true)
        setError('')
      }

      try {
        const data = await getMyProfile()
        if (!cancelled) setProfile(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loading, error }}>
      {children}
    </ProfileContext.Provider>
  )
}

export default ProfileProvider
