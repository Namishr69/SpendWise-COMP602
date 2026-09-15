import { useContext, useEffect, useState } from 'react'

import { CurrencyContext } from '../context/currencyContext.js'
import { convertCurrency } from '../api/exchangeRateApi.js'

export function useCurrencyRate() {
  const { preferredCurrency } = useContext(CurrencyContext)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    let cancelled = false

    convertCurrency(1, 'NZD', preferredCurrency)
      .then((convertedRate) => {
        if (!cancelled) {
          setRate(convertedRate)
        }
      })
      .catch((error) => {
        console.error('Failed to load currency rate:', error)

        if (!cancelled) {
          setRate(1)
        }
      })

    return () => {
      cancelled = true
    }
  }, [preferredCurrency])

  return {
    preferredCurrency,
    rate,
  }
}