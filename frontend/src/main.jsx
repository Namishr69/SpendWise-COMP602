import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SubscriptionsProvider } from './context/SubscriptionsProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SubscriptionsProvider>
      <App />
    </SubscriptionsProvider>
  </StrictMode>,
)