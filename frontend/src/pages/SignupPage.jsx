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
          <label className="auth-form__checkbox-row">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={submitting} />
            I agree to the Terms and Privacy Policy
          </label>
          {error && <p role="alert" className="auth-form__error">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="auth-form__switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </Card>
    </AuthLayout>
  )
}

export default SignupPage