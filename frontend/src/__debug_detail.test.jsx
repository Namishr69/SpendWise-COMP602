// @vitest-environment jsdom
// Temporary debug harness — real provider stack at /subscriptions/s1.

import { describe, it, vi, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

const { state } = vi.hoisted(() => ({
  state: { user: { uid: 'u1', email: 'a@b.c', getIdToken: vi.fn().mockResolvedValue('t') } },
}))

vi.mock('./firebase.js', () => ({ auth: { currentUser: state.user }, db: {} }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, callback) => { callback(state.user); return () => {} },
  signOut: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({ exists: () => false }),
}))

const subscription = {
  id: 's1', name: 'Netflix', amount: 15.99, billingCycle: 'Monthly',
  nextPaymentDate: '2026-11-06', status: 'Active', source: 'gmail-detected',
  subscriptionDate: '2026-01-06', createdAt: '2026-01-06T00:00:00.000Z',
}

vi.mock('./api/subscriptionApi.js', () => ({
  getSubscriptions: async () => [subscription],
  getPayments: async () => [],
  createPayment: async () => ({}),
  updateSubscription: async () => subscription,
}))
vi.mock('./api/translationApi.js', () => ({ translateTexts: async (u, t) => t }))
vi.mock('./api/exchangeRateApi.js', () => ({ convertCurrency: async () => 1 }))
vi.mock('./api/userApi.js', () => ({ getMyProfile: async () => ({}) }))
vi.mock('./api/languageApi.js', () => ({ getPreferredLanguage: async () => ({}) }))
vi.mock('./api/currencyApi.js', () => ({ getPreferredCurrency: async () => ({}) }))
vi.mock('./api/budgetApi.js', () => ({ getBudget: async () => null }))
vi.mock('./api/darkModeApi.js', () => ({ getDarkMode: async () => ({ darkMode: false }) }))
vi.mock('./api/priceAlertApi.js', () => ({ getPriceAlerts: async () => [], dismissPriceAlert: async () => ({}) }))

import App from './App.jsx'
import { SubscriptionsProvider } from './context/SubscriptionsProvider.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import CurrencyProvider from './context/CurrencyProvider.jsx'
import LanguageProvider from './context/LanguageProvider.jsx'
import BudgetProvider from './context/BudgetProvider.jsx'
import ProfileProvider from './context/ProfileProvider.jsx'
import ThemeProvider from './context/ThemeProvider.jsx'

describe('debug detail page', () => {
  it('renders a subscription without crashing', async () => {
    window.history.pushState({}, '', '/subscriptions/s1')

    render(
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <CurrencyProvider>
              <LanguageProvider>
                <BudgetProvider>
                  <SubscriptionsProvider>
                    <App />
                  </SubscriptionsProvider>
                </BudgetProvider>
              </LanguageProvider>
            </CurrencyProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>,
    )

    await new Promise((r) => setTimeout(r, 100))

    expect(screen.getByRole('heading', { name: 'Netflix' })).toBeTruthy()
    expect(screen.queryByText(/Total spent/i)).toBeTruthy()
  })
})
