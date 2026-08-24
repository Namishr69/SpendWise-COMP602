import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'
import { registerProfile } from '../api/userApi.js'
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    try {
      await createUserWithEmailAndPassword(auth, email, password)
      await registerProfile({ firstName, lastName, email })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <h2>Sign up</h2>
        <form onSubmit={handleSubmit}>
          <Input id="firstName" label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input id="lastName" label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <Button type="submit" fullWidth>Create account</Button>
        </form>
      </Card>
    </AuthLayout>
  )
}

export default SignupPage