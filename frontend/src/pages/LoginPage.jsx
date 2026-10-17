import { useState } from 'react'
import {
  Link,
  useNavigate,
} from 'react-router-dom'
import {
  signInWithEmailAndPassword,
} from 'firebase/auth'

import { auth } from '../firebase.js'
import {
  getAuthErrorMessage,
} from '../utils/authErrors.js'
import {
  signInWithGoogle,
} from '../utils/googleAuth.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import {
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  AppleIcon,
} from '../components/ui/icons.jsx'
import {
  useTranslations,
} from '../hooks/useTranslations.js'

import './AuthForm.css'

const LOGIN_TEXT = [
  'Login',
  'Login to access your SpendWise account',
  'Email',
  'Password',
  'Hide password',
  'Show password',
  'Remember me',
  'Forgot Password?',
  'Logging in...',
  "Don't have an account?",
  'Sign up',
  'Or login with',
  'Continue with Google',
  'Continue with Apple',
  'Please enter your email and password.',
  'Apple sign-in is coming soon.',
  'An account with this email already exists.',
  'Please enter a valid email address.',
  'Password should be at least 6 characters.',
  'Incorrect email or password.',
  'Too many attempts. Please try again later.',
  'Something went wrong. Please try again.',
]

function LoginPage() {
  const navigate = useNavigate()

  const [
    loginText,
    subtitleText,
    emailText,
    passwordText,
    hidePasswordText,
    showPasswordText,
    rememberMeText,
    forgotPasswordText,
    loggingInText,
    noAccountText,
    signUpText,
    orLoginWithText,
    continueGoogleText,
    continueAppleText,
    missingCredentialsText,
    appleComingSoonText,
    emailAlreadyExistsText,
    invalidEmailText,
    weakPasswordText,
    incorrectCredentialsText,
    tooManyRequestsText,
    genericErrorText,
  ] = useTranslations(LOGIN_TEXT)

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    rememberMe,
    setRememberMe,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const authErrorMessages = {
    emailAlreadyExists:
      emailAlreadyExistsText,
    invalidEmail:
      invalidEmailText,
    weakPassword:
      weakPasswordText,
    incorrectCredentials:
      incorrectCredentialsText,
    tooManyRequests:
      tooManyRequestsText,
    generic:
      genericErrorText,
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError(
        missingCredentialsText,
      )
      return
    }

    setSubmitting(true)

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password,
      )

      navigate('/dashboard')
    } catch (err) {
      setError(
        getAuthErrorMessage(
          err,
          authErrorMessages,
        ),
      )
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
      setError(
        getAuthErrorMessage(
          err,
          authErrorMessages,
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleAppleSignIn() {
    setError(
      appleComingSoonText,
    )
  }

  return (
    <AuthLayout variant="light">
      <div className="auth-panel">
        <h2 className="auth-form__title">
          {loginText}
        </h2>

        <p className="auth-form__subtitle">
          {subtitleText}
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            id="email"
            label={emailText}
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value,
              )
            }
            disabled={submitting}
          />

          <div className="auth-form__password-wrap">
            <Input
              id="password"
              label={passwordText}
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value,
                )
              }
              disabled={submitting}
            />

            <button
              type="button"
              className="auth-form__password-toggle"
              onClick={() =>
                setShowPassword(
                  (current) =>
                    !current,
                )
              }
              aria-label={
                showPassword
                  ? hidePasswordText
                  : showPasswordText
              }
            >
              {showPassword ? (
                <EyeOffIcon />
              ) : (
                <EyeIcon />
              )}
            </button>
          </div>

          <div className="auth-form__checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(
                    e.target.checked,
                  )
                }
                disabled={submitting}
              />

              {rememberMeText}
            </label>

            <Link to="/forgot-password">
              {forgotPasswordText}
            </Link>
          </div>

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
            disabled={submitting}
          >
            {submitting
              ? loggingInText
              : loginText}
          </Button>
        </form>

        <p className="auth-form__switch">
          {noAccountText}{' '}

          <Link to="/signup">
            {signUpText}
          </Link>
        </p>

        <div className="auth-form__divider">
          {orLoginWithText}
        </div>

        <div className="auth-form__social">
          <button
            type="button"
            className="auth-form__social-button"
            onClick={
              handleGoogleSignIn
            }
            disabled={submitting}
            aria-label={
              continueGoogleText
            }
          >
            <GoogleIcon />
          </button>

          <button
            type="button"
            className="auth-form__social-button"
            onClick={
              handleAppleSignIn
            }
            disabled={submitting}
            aria-label={
              continueAppleText
            }
          >
            <AppleIcon />
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

export default LoginPage