import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'
import { registerProfile } from '../api/userApi.js'
import { getAuthErrorMessage } from '../utils/authErrors.js'
import { signInWithGoogle } from '../utils/googleAuth.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import { EyeIcon, EyeOffIcon, GoogleIcon, AppleIcon } from '../components/ui/icons.jsx'
import './AuthForm.css'

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

  function handleAppleSignIn() {
    setError('Apple sign-up is coming soon.')
  }

  return (
    <AuthLayout variant="dark">
      <div className="auth-panel">
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
            <button
              type="button"
              className="auth-form__password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
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
            <span>
              I agree to all the <span className="auth-form__inline-link">Terms</span> and{' '}
              <span className="auth-form__inline-link">Privacy Policies</span>
            </span>
          </label>
          {error && <p role="alert" className="auth-form__error">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="auth-form__switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>

        <div className="auth-form__divider">Or sign up with</div>
        <div className="auth-form__social">
          <button type="button" className="auth-form__social-button" onClick={handleGoogleSignIn} disabled={submitting} aria-label="Sign up with Google">
            <GoogleIcon />
          </button>
          <button type="button" className="auth-form__social-button" onClick={handleAppleSignIn} disabled={submitting} aria-label="Sign up with Apple">
            <AppleIcon />
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

export default SignupPage
