import { useState } from 'react'
import { auth } from '../firebase.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Card from '../components/ui/Card.jsx'
import { Link } from 'react-router-dom'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import { sendPasswordResetEmail } from 'firebase/auth'

function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (!email) {
            setError('Please fill in an email.')
            return
        }

        setLoading(true)
        try {
            await sendPasswordResetEmail(auth, email)
            setSuccess(true)
        } catch (err) {
            console.log(err)
            setSuccess(true)
        } finally {
            setLoading(false)
        }

    }

    if (success) {
        return (
            <AuthLayout>
                <Card>
                    <h2 className="auth-form__title">Check your email</h2>
                    <p className="auth-form__subtitle">
                        If an account exists with that email, a password reset link has been sent.
                    </p>
                    <Link to="/login">Back to Login</Link>
                </Card>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <Card>
                <h2 className="auth-form__title">Reset your password</h2>
                <p className="auth-form__subtitle">
                    Enter your email and we'll send you a reset link.
                </p>
                <form onSubmit={handleSubmit}>
                    <Input
                        id="email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                    {error && <p role="alert" className="auth-form__error">{error}</p>}
                    <Button type="submit" fullWidth disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                </form>
                <p className="auth-form__switch">
                    <Link to="/login">Back to Login</Link>
                </p>
            </Card>
        </AuthLayout>
    )
}

export default ForgotPasswordPage