import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase.js'
import { registerProfile } from '../api/userApi.js'

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