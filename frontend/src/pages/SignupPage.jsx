import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'
import { registerProfile } from '../api/userApi.js'
import { getAuthErrorMessage } from '../utils/authErrors.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'

function SignupPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setSubmitting(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      await registerProfile({ firstName, lastName, email })
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
        <h2>Sign up</h2>
        <form onSubmit={handleSubmit}>
          <Input id="firstName" label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={submitting} />
          <Input id="lastName" label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={submitting} />
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
          <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
          {error && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 16 }}>{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  )
}

export default SignupPage