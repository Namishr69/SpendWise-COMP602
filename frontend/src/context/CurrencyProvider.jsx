import { useContext, useEffect, useState } from 'react'

import { DEFAULT_CURRENCY } from '../constants/currencies.js'
import { getPreferredCurrency } from '../api/currencyApi.js'
import { AuthContext } from './authContext.js'
import { CurrencyContext } from './currencyContext'

function CurrencyProvider({ children }) {
  const { currentUser } = useContext(AuthContext)

  const [preferredCurrency, setPreferredCurrency] =
    useState(DEFAULT_CURRENCY)

  useEffect(() => {
    async function loadPreferredCurrency() {
      if (!currentUser) {
        setPreferredCurrency(DEFAULT_CURRENCY)
        return
      }

      try {
        const data = await getPreferredCurrency(currentUser)

        setPreferredCurrency(
          data.preferredCurrency || DEFAULT_CURRENCY
        )
      } catch (error) {
        console.error(
          'Failed to load preferred currency:',
          error
        )

        setPreferredCurrency(DEFAULT_CURRENCY)
      }
    }

    loadPreferredCurrency()
  }, [currentUser])

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