/**
 * Maps Firebase Auth error codes to user-facing messages.
 * Pages can provide translated messages.
 * Falls back to English when translations are not supplied.
 */
export function getAuthErrorMessage(
  error,
  messages = {},
) {
  const {
    emailAlreadyExists =
      'An account with this email already exists.',
    invalidEmail =
      'Please enter a valid email address.',
    weakPassword =
      'Password should be at least 6 characters.',
    incorrectCredentials =
      'Incorrect email or password.',
    tooManyRequests =
      'Too many attempts. Please try again later.',
    generic =
      'Something went wrong. Please try again.',
  } = messages

  switch (error?.code) {
    case 'auth/email-already-in-use':
      return emailAlreadyExists

    case 'auth/invalid-email':
      return invalidEmail

    case 'auth/weak-password':
      return weakPassword

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return incorrectCredentials

    case 'auth/too-many-requests':
      return tooManyRequests

    default:
      return generic
  }
}