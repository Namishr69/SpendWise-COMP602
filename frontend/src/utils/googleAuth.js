import {
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  reauthenticateWithPopup,
} from 'firebase/auth'
import { auth } from '../firebase.js'
import { registerProfile } from '../api/userApi.js'

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  const credential = await signInWithPopup(auth, provider)
  const user = credential.user

  const [firstName, ...rest] = (user.displayName || '').split(' ')
  const lastName = rest.join(' ')

  await registerProfile({
    firstName: firstName || '',
    lastName: lastName || '',
    email: user.email,
  })

  return user
}

/**
 * Asks Google for read-only Gmail access for the signed-in user and returns
 * the short-lived OAuth access token. It is passed straight to the backend
 * for one scan and never stored.
 *
 * Users who signed in with Google re-confirm their account; users who signed
 * up with email and password get Google linked to their account instead, so
 * neither is signed out.
 */
export async function requestGmailAccess() {
  const provider = new GoogleAuthProvider()
  provider.addScope(GMAIL_READONLY_SCOPE)

  const user = auth.currentUser
  const hasGoogle = user.providerData.some(
    (info) => info.providerId === 'google.com',
  )

  try {
    const result = hasGoogle
      ? await reauthenticateWithPopup(user, provider)
      : await linkWithPopup(user, provider)

    return GoogleAuthProvider.credentialFromResult(result).accessToken
  } catch (error) {
    // Picking a Google account that is already tied to another SpendWise
    // login fails the link, but Google still granted the token — use it.
    const credential = GoogleAuthProvider.credentialFromError(error)
    if (credential?.accessToken) return credential.accessToken

    throw error
  }
}
