import { useState } from 'react'
import {
  Link,
  useNavigate,
} from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
} from 'firebase/auth'

import { auth } from '../firebase.js'
import {
  registerProfile,
} from '../api/userApi.js'
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

const SIGNUP_TEXT = [
  'Sign up',
  "Let's get you all set up so you can access your personal account.",
  'First Name',
  'Last Name',
  'Email',
  'Password',
  'Confirm Password',
  'Hide password',
  'Show password',
  'I agree to all the',
  'Terms',
  'and',
  'Privacy Policies',
  'Creating account...',
  'Create account',
  'Already have an account?',
  'Login',
  'Or sign up with',
  'Sign up with Google',
  'Sign up with Apple',
  'Please fill in all fields.',
  'Passwords do not match.',
  'Please agree to the Terms and Privacy Policy to continue.',
  'Account created, but we could not save your details. You can still log in — please try updating your profile afterwards.',
  'Apple sign-up is coming soon.',
  'An account with this email already exists.',
  'Please enter a valid email address.',
  'Password should be at least 6 characters.',
  'Incorrect email or password.',
  'Too many attempts. Please try again later.',
  'Something went wrong. Please try again.',
]

function SignupPage() {
  const navigate = useNavigate()

  const [
    signUpText,
    subtitleText,
    firstNameText,
    lastNameText,
    emailText,
    passwordText,
    confirmPasswordText,
    hidePasswordText,
    showPasswordText,
    agreeText,
    termsText,
    andText,
    privacyPoliciesText,
    creatingAccountText,
    createAccountText,
    alreadyHaveAccountText,
    loginText,
    orSignUpWithText,
    signUpGoogleText,
    signUpAppleText,
    fillFieldsText,
    passwordsDoNotMatchText,
    agreeRequiredText,
    profileSaveFailedText,
    appleComingSoonText,
    emailAlreadyExistsText,
    invalidEmailText,
    weakPasswordText,
    incorrectCredentialsText,
    tooManyRequestsText,
    genericErrorText,
  ] = useTranslations(SIGNUP_TEXT)

  const [firstName, setFirstName] =
    useState('')

  const [lastName, setLastName] =
    useState('')

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [agreed, setAgreed] =
    useState(false)

  const [
    showPassword,
    setShowPassword,
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

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      setError(fillFieldsText)
      return
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        passwordsDoNotMatchText,
      )
      return
    }

    if (!agreed) {
      setError(agreeRequiredText)
      return
    }

    setSubmitting(true)

    let createdUser = null

    try {
      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        )

      createdUser = credential.user

      await registerProfile({
        firstName,
        lastName,
        email,
      })

      navigate('/dashboard')
    } catch (err) {
      if (createdUser) {
        setError(
          profileSaveFailedText,
        )
      } else {
        setError(
          getAuthErrorMessage(
            err,
            authErrorMessages,
          ),
        )
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
    <AuthLayout variant="dark">
      <div className="auth-panel">
        <h2 className="auth-form__title">
          {signUpText}
        </h2>

        <p className="auth-form__subtitle">
          {subtitleText}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="auth-form__row">
            <Input
              id="firstName"
              label={firstNameText}
              value={firstName}
              onChange={(e) =>
                setFirstName(
                  e.target.value,
                )
              }
              disabled={submitting}
            />

            <Input
              id="lastName"
              label={lastNameText}
              value={lastName}
              onChange={(e) =>
                setLastName(
                  e.target.value,
                )
              }
              disabled={submitting}
            />
          </div>

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

          <Input
            id="confirmPassword"
            label={confirmPasswordText}
            type={
              showPassword
                ? 'text'
                : 'password'
            }
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(
                e.target.value,
              )
            }
            disabled={submitting}
          />

          <label className="auth-form__terms-row">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) =>
                setAgreed(
                  e.target.checked,
                )
              }
              disabled={submitting}
            />

            <span>
              {agreeText}{' '}

              <span className="auth-form__inline-link">
                {termsText}
              </span>{' '}

              {andText}{' '}

              <span className="auth-form__inline-link">
                {privacyPoliciesText}
              </span>
            </span>
          </label>

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
              ? creatingAccountText
              : createAccountText}
          </Button>
        </form>

        <p className="auth-form__switch">
          {alreadyHaveAccountText}{' '}

          <Link to="/login">
            {loginText}
          </Link>
        </p>

        <div className="auth-form__divider">
          {orSignUpWithText}
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
              signUpGoogleText
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
              signUpAppleText
            }
          >
            <AppleIcon />
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

export default SignupPage