import { createContext, useContext } from 'react'

const SubscriptionsContext = createContext(null)

export function useSubscriptions() {
  const context = useContext(SubscriptionsContext)

  if (!context) {
    throw new Error(
      'useSubscriptions must be used inside SubscriptionsProvider',
    )
  }

  return context
}

export { SubscriptionsContext }
