import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase.js'
import { getMyProfile } from '../api/userApi.js'

export const ThemeContext = createContext()

function ThemeProvider({ children }) {
  const [darkMode, setDarkModeState] = useState(false)

  // Load the saved preference once we know who's signed in.
  useEffect(() => {
    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) setDarkModeState(false)
        return
      }

      try {
        const profile = await getMyProfile()
        if (!cancelled) {
          setDarkModeState(Boolean(profile?.darkMode))
        }
      } catch (error) {
        console.error('Failed to load dark mode preference:', error)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Apply the theme attribute to <html> whenever darkMode changes.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkModeState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider