import { createContext, useState } from 'react'
import { DEFAULT_CURRENCY } from '../constants/currencies.js'

export const CurrencyContext = createContext()

function CurrencyProvider({ children }) {
  const [preferredCurrency, setPreferredCurrency] =
    useState(DEFAULT_CURRENCY)

  return (
    <CurrencyContext.Provider
      value={{
        preferredCurrency,
        setPreferredCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export default CurrencyProvider