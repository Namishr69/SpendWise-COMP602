import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { SubscriptionsContext } from './subscriptionsContext'
import * as subscriptionApi from '../api/subscriptionApi'

export function SubscriptionsProvider({ children }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setSubscriptions([])
          setError(null)
          setLoading(false)
        }
        return
      }

      try {
        const data = await subscriptionApi.getSubscriptions()
        if (!cancelled) {
          setSubscriptions(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
        }
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

  function getSubscription(id) {
    return subscriptions.find((subscription) => subscription.id === id)
  }

  async function updateSubscription(id, changes) {
    const updated = await subscriptionApi.updateSubscription(id, changes)
    setSubscriptions((currentSubscriptions) =>
      currentSubscriptions.map((subscription) =>
        subscription.id === id ? updated : subscription,
      ),
    )
    return updated
  }

  return (
    <SubscriptionsContext.Provider
      value={{ subscriptions, loading, error, getSubscription, updateSubscription }}
    >
      {children}
    </SubscriptionsContext.Provider>
  )
}
