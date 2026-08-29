import exchangeRateService from '../services/exchangeRateService.js';

const exchangeRateController = {
  async convert(req, res) {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;

      const convertedAmount = await exchangeRateService.convertCurrency(
        Number(amount),
        fromCurrency,
        toCurrency
      );

      res.json({
        amount: Number(amount),
        fromCurrency,
        toCurrency,
        convertedAmount,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

export default exchangeRateController;