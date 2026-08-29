const EXCHANGE_RATES = {
  NZD: 1,
  USD: 0.60,
  AUD: 0.83,
  EUR: 0.51,
  GBP: 0.44,
  JPY: 94.67,
  CAD: 0.83,
  SGD: 0.76,
  PHP: 36.69,
};

const exchangeRateService = {
  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (!amount && amount !== 0) {
      throw new Error('Amount is required')
    }

    if (!fromCurrency || !toCurrency) {
      throw new Error('Currency is required')
    }

    if (fromCurrency === toCurrency) {
      return Number(amount.toFixed(2))
    }

    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${fromCurrency}/${toCurrency}`
    )

    if (!response.ok) {
      throw new Error('Unable to retrieve exchange rate')
    }

    const data = await response.json()

    const convertedAmount = amount * data.rate

    return Number(convertedAmount.toFixed(2))
  },
}

export default exchangeRateService