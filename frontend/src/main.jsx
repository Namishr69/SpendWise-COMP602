import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SubscriptionsProvider } from './context/SubscriptionsProvider.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import CurrencyProvider from './context/CurrencyProvider.jsx'
import BudgetProvider from './context/BudgetProvider.jsx'
import ProfileProvider from './context/ProfileProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ProfileProvider>
        <CurrencyProvider>
          <BudgetProvider>
            <SubscriptionsProvider>
              <App />
            </SubscriptionsProvider>
          </BudgetProvider>
        </CurrencyProvider>
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>,
)