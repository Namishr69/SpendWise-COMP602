import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './context/PrivateRoute.jsx'
import PublicRoute from './context/PublicRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import SubscriptionsPage from './pages/SubscriptionsPage.jsx'
import SubscriptionDetailPage from './pages/SubscriptionDetailPage.jsx'
import EditSubscriptionPage from './pages/EditSubscriptionPage.jsx'
import AddSubscriptionPage from './pages/AddSubscriptionPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/subscriptions"
          element={
            <PrivateRoute>
              <SubscriptionsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/subscriptions/new"
          element={
            <PrivateRoute>
              <AddSubscriptionPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/subscriptions/:subscriptionId"
          element={
            <PrivateRoute>
              <SubscriptionDetailPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/subscriptions/:subscriptionId/edit"
          element={
            <PrivateRoute>
              <EditSubscriptionPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
