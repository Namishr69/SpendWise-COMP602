import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  sendPasswordResetEmail,
} from 'firebase/auth'

import { auth } from '../firebase.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import {
  useTranslations,
} from '../hooks/useTranslations.js'

const FORGOT_PASSWORD_TEXT = [
  'Check your email',
  'If an account exists with that email, a password reset link has been sent.',
  'Back to Login',
  'Reset your password',
  "Enter your email and we'll send you a reset link.",
  'Email',
  'Please fill in an email.',
  'Sending...',
  'Send Reset Link',
]

function ForgotPasswordPage() {
  const [
    checkEmailText,
    emailSentText,
    backToLoginText,
    resetPasswordText,
    resetDescriptionText,
    emailText,
    emailRequiredText,
    sendingText,
    sendResetLinkText,
  ] = useTranslations(
    FORGOT_PASSWORD_TEXT,
  )

  const [email, setEmail] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email) {
      setError(emailRequiredText)
      return
    }

    setLoading(true)

    try {
      await sendPasswordResetEmail(
        auth,
        email,
      )

      setSuccess(true)
    } catch (err) {
      console.log(err)

      // Keep the same response even when the
      // email does not exist. This avoids
      // revealing which emails have accounts.
      setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <Card>
          <h2 className="auth-form__title">
            {checkEmailText}
          </h2>

          <p className="auth-form__subtitle">
            {emailSentText}
          </p>

          <Link to="/login">
            {backToLoginText}
          </Link>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Card>
        <h2 className="auth-form__title">
          {resetPasswordText}
        </h2>

        <p className="auth-form__subtitle">
          {resetDescriptionText}
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            id="email"
            label={emailText}
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            disabled={loading}
          />

          {error && (
            <p
              role="alert"
              className="auth-form__error"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading
              ? sendingText
              : sendResetLinkText}
          </Button>
        </form>

        <p className="auth-form__switch">
          <Link to="/login">
            {backToLoginText}
          </Link>
        </p>
      </Card>
    </AuthLayout>
  )
}

export default ForgotPasswordPage