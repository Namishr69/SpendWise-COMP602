import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'
import { getAuthErrorMessage } from '../utils/authErrors.js'
import { signInWithGoogle } from '../utils/googleAuth.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import './AuthForm.css'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

      async function handleGoogleSignIn() {
    setError('')
    setSubmitting(true)
    try {
      await signInWithGoogle()
      navigate('/dashboard')
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <AuthLayout>
      <Card>
        <h2 className="auth-form__title">Login</h2>
        <p className="auth-form__subtitle">Login to access your SpendWise account</p>
        <form onSubmit={handleSubmit}>
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
          <div className="auth-form__password-wrap">
            <Input
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <button type="button" className="auth-form__password-toggle" onClick={() => setShowPassword((s) => !s)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="auth-form__checkbox-row">
            <label>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={submitting} />
              Remember me
            </label>
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
          {error && <p role="alert" className="auth-form__error">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="auth-form__divider">Or {submitting ? '...' : 'continue with'}</div>
        <button type="button" className="auth-form__google-button" onClick={handleGoogleSignIn} disabled={submitting}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <p className="auth-form__switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </Card>
    </AuthLayout>
  )
}

export default LoginPage