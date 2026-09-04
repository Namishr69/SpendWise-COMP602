import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase.js'
import { getMyProfile } from '../api/userApi.js'

export const BudgetContext = createContext()

function BudgetProvider({ children }) {
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setBudget(null)
          setLoading(false)
        }
        return
      }

      try {
        const profile = await getMyProfile()
        if (!cancelled) {
          setBudget(profile?.budget || null)
        }
      } catch (error) {
        console.error('Failed to load budget:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <BudgetContext.Provider value={{ budget, setBudget, loading }}>
      {children}
    </BudgetContext.Provider>
  )
}

export default BudgetProvider