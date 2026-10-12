import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { SubscriptionsContext } from './subscriptionsContext'
import * as subscriptionApi from '../api/subscriptionApi'

export function SubscriptionsProvider({ children }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Re-fetch the signed-in user's subscriptions. Exposed on the context so
  // flows that create subscriptions elsewhere (e.g. a Gmail inbox scan in
  // Settings) can refresh the list without a full page reload.
  const refreshSubscriptions = useCallback(async () => {
    if (!auth.currentUser) {
      setSubscriptions([])
      return []
    }

    const data = await subscriptionApi.getSubscriptions()
    setSubscriptions(data)
    setError(null)
    return data
  }, [])

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

  async function deleteSubscription(id) {
    await subscriptionApi.deleteSubscription(id)
    setSubscriptions((currentSubscriptions) =>
      currentSubscriptions.filter((subscription) => subscription.id !== id),
    )
  }

  async function createSubscription(data) {
    const created = await subscriptionApi.createSubscription(data)
    setSubscriptions((currentSubscriptions) => [created, ...currentSubscriptions])
    return created
  }

  return (
    <SubscriptionsContext.Provider
      value={{
        subscriptions,
        loading,
        error,
        getSubscription,
        updateSubscription,
        deleteSubscription,
        createSubscription,
        refreshSubscriptions,
      }}
    >
      {children}
    </SubscriptionsContext.Provider>
  )
}
