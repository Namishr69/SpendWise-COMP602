import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'
import { registerProfile } from '../api/userApi.js'
import { getAuthErrorMessage } from '../utils/authErrors.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import './AuthForm.css'
import { signInWithGoogle } from '../utils/googleAuth.js'

function SignupPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreed) {
      setError('Please agree to the Terms and Privacy Policy to continue.')
      return
    }

    setSubmitting(true)
    let createdUser = null
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      createdUser = credential.user
      await registerProfile({ firstName, lastName, email })
      navigate('/dashboard')
    } catch (err) {
      if (createdUser) {
        // Auth account was created but saving the profile failed (e.g. backend
        // unreachable). The account still exists, so let the user know their
        // login will work even though we couldn't save their name yet.
        setError('Account created, but we could not save your details. You can still log in — please try updating your profile afterwards.')
      } else {
        setError(getAuthErrorMessage(err))
      }
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
        <h2 className="auth-form__title">Sign up</h2>
        <p className="auth-form__subtitle">Let's get you all set up so you can access your personal account.</p>
        <form onSubmit={handleSubmit}>
          <div className="auth-form__row">
            <Input id="firstName" label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={submitting} />
            <Input id="lastName" label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={submitting} />
          </div>
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
          <Input
            id="confirmPassword"
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
          />
          <label className="auth-form__terms-row">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={submitting} />
            I agree to the Terms and Privacy Policy
          </label>
          {error && <p role="alert" className="auth-form__error">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
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
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </Card>
    </AuthLayout>
  )
}

export default SignupPage