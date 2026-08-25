import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'
import { getAuthErrorMessage } from '../utils/authErrors.js'
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
          <label className="auth-form__checkbox-row">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={submitting} />
            Remember me
          </label>
          {error && <p role="alert" className="auth-form__error">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <p className="auth-form__switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </Card>
    </AuthLayout>
  )
}

export default LoginPage