import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'
import { getAuthErrorMessage } from '../utils/authErrors.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
          <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
          {error && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 16 }}>{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  )
}

export default LoginPage