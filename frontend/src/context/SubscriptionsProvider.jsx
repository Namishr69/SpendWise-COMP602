import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { SubscriptionsContext } from './subscriptionsContext'
import * as subscriptionApi from '../api/subscriptionApi'
import {
  countsAsSubscription,
  isPendingReview,
} from '../utils/subscriptionReview.js'

export function SubscriptionsProvider({ children }) {
  // Every record from the API, including email finds still waiting in
  // Pending and rejected ones. Pages get the split lists below.
  const [allSubscriptions, setSubscriptions] = useState([])
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

  // Real subscriptions for every page's lists and totals, and the email finds
  // the user still has to confirm or reject.
  const subscriptions = useMemo(
    () => allSubscriptions.filter(countsAsSubscription),
    [allSubscriptions],
  )

  const pendingSubscriptions = useMemo(
    () => allSubscriptions.filter(isPendingReview),
    [allSubscriptions],
  )

  function getSubscription(id) {
    return allSubscriptions.find((subscription) => subscription.id === id)
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
        pendingSubscriptions,
        loading,
        error,
        refresh,
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
