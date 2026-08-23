import { useState } from 'react'
import { initialSubscriptions } from '../data/mockSubscriptions'
import { SubscriptionsContext } from './subscriptionsContext'

export function SubscriptionsProvider({ children }) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)

  function getSubscription(id) {
    return subscriptions.find((subscription) => subscription.id === id)
  }

  function updateSubscription(id, changes) {
    setSubscriptions((currentSubscriptions) =>
      currentSubscriptions.map((subscription) =>
        subscription.id === id
          ? { ...subscription, ...changes }
          : subscription,
      ),
    )
  }

  return (
    <SubscriptionsContext.Provider
      value={{ subscriptions, getSubscription, updateSubscription }}
    >
      {children}
    </SubscriptionsContext.Provider>
  )
}
