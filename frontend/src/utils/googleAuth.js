import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase.js'
import { registerProfile } from '../api/userApi.js'

/**
 * Signs in with Google via popup, then ensures a profile document
 * exists in Firestore (registerProfile is idempotent - if the user
 * already has a profile, the backend just returns the existing one
 * instead of overwriting it).
 */
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