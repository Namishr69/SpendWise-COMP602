import {
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  DEFAULT_LANGUAGE,
} from '../constants/languages.js'
import {
  getPreferredLanguage,
} from '../api/languageApi.js'
import {
  AuthContext,
} from './authContext.js'
import {
  LanguageContext,
} from './languageContext.js'

const LANGUAGE_STORAGE_KEY =
  'spendwisePreferredLanguage'

function getStoredLanguage() {
  try {
    return (
      localStorage.getItem(
        LANGUAGE_STORAGE_KEY,
      ) || DEFAULT_LANGUAGE
    )
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function LanguageProvider({
  children,
}) {
  const { currentUser } =
    useContext(AuthContext)

  const [
    preferredLanguage,
    setPreferredLanguageState,
  ] = useState(getStoredLanguage)

  function setPreferredLanguage(
    language,
  ) {
    setPreferredLanguageState(
      language,
    )

    try {
      localStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        language,
      )
    } catch {
      // The language still works for
      // the current session.
    }
  }

  useEffect(() => {
    async function loadPreferredLanguage() {
      if (!currentUser) {
        setPreferredLanguageState(
          getStoredLanguage(),
        )
        return
      }

      try {
        const data =
          await getPreferredLanguage(
            currentUser,
          )

        const language =
          data.preferredLanguage ||
          DEFAULT_LANGUAGE

        setPreferredLanguageState(
          language,
        )

        try {
          localStorage.setItem(
            LANGUAGE_STORAGE_KEY,
            language,
          )
        } catch {
          // Firestore remains the main
          // preference for logged-in users.
        }
      } catch (error) {
        console.error(
          'Failed to load preferred language:',
          error,
        )

        setPreferredLanguageState(
          getStoredLanguage(),
        )
      }
    }

    loadPreferredLanguage()
  }, [currentUser])

  return (
    <LanguageContext.Provider
      value={{
        preferredLanguage,
        setPreferredLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export default LanguageProvider