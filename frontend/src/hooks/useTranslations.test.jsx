// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReducer } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { useTranslations } from './useTranslations.js'
import { translateTexts } from '../api/translationApi.js'

// vi.mock is hoisted above every top-level statement, so the object the mocks
// close over has to be created inside vi.hoisted.
const { languageState } = vi.hoisted(() => ({
  languageState: {
    // Stands in for React's context object: useContext reads `_currentValue`,
    // so assigning to it is what switches language / signed-in user per test.
    currentUser: { uid: 'test-user' },
    preferredLanguage: 'es',
  },
}))

vi.mock('../context/authContext.js', () => ({
  AuthContext: {
    _currentValue: languageState,
    Provider: ({ children }) => children,
  },
}))

vi.mock('../context/languageContext.js', () => ({
  LanguageContext: {
    _currentValue: languageState,
    Provider: ({ children }) => children,
  },
}))

vi.mock('../api/translationApi.js', () => ({
  translateTexts: vi.fn(),
}))

const signedInUser = languageState.currentUser

describe('useTranslations', () => {
  beforeEach(() => {
    languageState.currentUser = signedInUser
    languageState.preferredLanguage = 'es'

    translateTexts.mockReset()
    translateTexts.mockImplementation(async (user, texts, language) =>
      texts.map((text) => `[${language}] ${text}`),
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('translates the texts once for the selected language', async () => {
    function Probe() {
      const [title, subtitle] = useTranslations([
        'Subscriptions',
        'Next payment:',
      ])

      return (
        <>
          <span data-testid="title">{title}</span>
          <span data-testid="subtitle">{subtitle}</span>
        </>
      )
    }

    render(<Probe />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(translateTexts).toHaveBeenCalledOnce()
    expect(translateTexts).toHaveBeenCalledWith(
      signedInUser,
      ['Subscriptions', 'Next payment:'],
      'es',
    )
    expect(screen.getByTestId('title')).toHaveTextContent(
      '[es] Subscriptions',
    )
    expect(screen.getByTestId('subtitle')).toHaveTextContent(
      '[es] Next payment:',
    )
  })

  it('does not re-request or revert when the caller passes a new array each render', async () => {
    // Every real page passes an inline array literal, which is a new identity
    // on every render. This used to re-run the effect each time and reset the
    // translations to English, so the page never showed a translation.
    function Probe() {
      const [, forceRender] = useReducer((count) => count + 1, 0)
      // Unique strings per test: the hook's cache is module-level and keyed by
      // the text, so reusing an earlier test's strings would hit that cache.
      const labels = useTranslations([
        'Repeated render title',
        'Repeated render subtitle',
      ])

      return (
        <button
          data-testid="rerender"
          onClick={forceRender}
        >
          {labels[0]}
        </button>
      )
    }

    render(<Probe />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('rerender')).toHaveTextContent(
      '[es] Repeated render title',
    )

    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        screen.getByTestId('rerender').click()
      })
    }

    expect(translateTexts).toHaveBeenCalledOnce()
    expect(screen.getByTestId('rerender')).toHaveTextContent(
      '[es] Repeated render title',
    )
  })

  it('leaves English text untouched and never calls the API', async () => {
    languageState.preferredLanguage = 'en'

    function Probe() {
      const [title] = useTranslations(['Subscriptions'])

      return <span data-testid="title">{title}</span>
    }

    render(<Probe />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('title')).toHaveTextContent(
      'Subscriptions',
    )
    expect(translateTexts).not.toHaveBeenCalled()
  })

  it('falls back to the original English when translation fails', async () => {
    translateTexts.mockRejectedValue(
      new Error('Google Translate API key is not configured'),
    )

    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    function Probe() {
      const [title] = useTranslations(['Subscriptions'])

      return <span data-testid="title">{title}</span>
    }

    render(<Probe />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('title')).toHaveTextContent(
      'Subscriptions',
    )
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
