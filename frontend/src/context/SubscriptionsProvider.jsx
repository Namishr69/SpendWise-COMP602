import { useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { SubscriptionsContext } from './subscriptionsContext'
import * as subscriptionApi from '../api/subscriptionApi'

export function SubscriptionsProvider({ children }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Stops a refresh from setting state after unmount.
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /**
   * Re-reads the subscription list from the API.
   *
   * Exposed on the context so a page can pull fresh data after an action that
   * creates subscriptions server-side — notably a bank sync, which detects new
   * recurring payments. Without this the list would stay frozen at whatever it
   * held when the user signed in, and detected subscriptions would only appear
   * after a full page reload.
   *
   * `silent` skips the loading flag, so a refresh triggered by a background
   * sync doesn't blank a page that is already showing data.
   */
  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)

    try {
      const data = await subscriptionApi.getSubscriptions()
      if (!mountedRef.current) return data
      setSubscriptions(data)
      setError(null)
      return data
    } catch (err) {
      if (mountedRef.current) setError(err)
      throw err
    } finally {
      if (mountedRef.current && !silent) setLoading(false)
    }
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
        refresh,
        getSubscription,
        updateSubscription,
        deleteSubscription,
        createSubscription,
      }}
    >
      {children}
    </SubscriptionsContext.Provider>
  )
}
