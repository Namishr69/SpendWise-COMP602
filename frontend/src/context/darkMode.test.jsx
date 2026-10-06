// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import ThemeProvider, { ThemeContext } from './ThemeProvider.jsx'
import { updateDarkMode } from '../api/darkModeApi.js'
import { onAuthStateChanged } from 'firebase/auth'
import { getMyProfile } from '../api/userApi.js'

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}))

vi.mock('../firebase.js', () => ({
  auth: {},
}))

vi.mock('../api/userApi.js', () => ({
  getMyProfile: vi.fn(),
}))

function ThemeConsumer() {
  return (
    <ThemeContext.Consumer>
      {({ darkMode, setDarkModeState }) => (
        <div>
          <span data-testid="dark-mode">
            {darkMode ? 'dark' : 'light'}
          </span>

          <button onClick={() => setDarkModeState(true)}>
            Enable Dark Mode
          </button>

          <button onClick={() => setDarkModeState(false)}>
            Disable Dark Mode
          </button>
        </div>
      )}
    </ThemeContext.Consumer>
  )
}

describe('Dark Mode - ThemeProvider', () => {
  let unsubscribe

  beforeEach(() => {
    unsubscribe = vi.fn()

    onAuthStateChanged.mockImplementation((auth, callback) => {
      return unsubscribe
    })

    getMyProfile.mockReset()

    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('data-theme')
  })

  it('starts in light mode', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('dark-mode')).toHaveTextContent('light')
  })

  it('applies the light theme to the document by default', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'light',
    )
  })

  it('changes to dark mode when dark mode is enabled', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await act(async () => {
      screen.getByRole('button', {
        name: 'Enable Dark Mode',
      }).click()
    })

    expect(screen.getByTestId('dark-mode')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'dark',
    )
  })

  it('changes back to light mode when dark mode is disabled', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await act(async () => {
      screen.getByRole('button', {
        name: 'Enable Dark Mode',
      }).click()
    })

    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'dark',
    )

    await act(async () => {
      screen.getByRole('button', {
        name: 'Disable Dark Mode',
      }).click()
    })

    expect(screen.getByTestId('dark-mode')).toHaveTextContent('light')
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'light',
    )
  })

  it('loads the saved dark mode preference for a signed-in user', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: 'test-user' })
      return unsubscribe
    })

    getMyProfile.mockResolvedValue({
      darkMode: true,
    })

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(getMyProfile).toHaveBeenCalledOnce()
    expect(screen.getByTestId('dark-mode')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'dark',
    )
  })

  it('loads light mode when the saved preference is false', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: 'test-user' })
      return unsubscribe
    })

    getMyProfile.mockResolvedValue({
      darkMode: false,
    })

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('dark-mode')).toHaveTextContent('light')
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'light',
    )
  })

  it('uses light mode when there is no signed-in user', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null)
      return unsubscribe
    })

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('dark-mode')).toHaveTextContent('light')
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'light',
    )

    expect(getMyProfile).not.toHaveBeenCalled()
  })

  it('keeps light mode when loading the profile fails', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: 'test-user' })
      return unsubscribe
    })

    getMyProfile.mockRejectedValue(
      new Error('Profile request failed'),
    )

    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('dark-mode')).toHaveTextContent('light')
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'light',
    )

    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('unsubscribes from Firebase auth when unmounted', () => {
    const { unmount } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    unmount()

    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})

describe('Dark Mode - updateDarkMode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws an error when there is no logged-in user', async () => {
    await expect(updateDarkMode(null, true))
      .rejects
      .toThrow('User is not logged in')
  })

  it('gets the user token before making the request', async () => {
    const getIdToken = vi.fn().mockResolvedValue('test-token')

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ darkMode: true }),
    })

    const user = { getIdToken }

    await updateDarkMode(user, true)

    expect(getIdToken).toHaveBeenCalledOnce()
  })

  it('sends the correct dark mode value to the API', async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ darkMode: true }),
    })

    await updateDarkMode(user, true)

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/dark-mode',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ darkMode: true }),
      }),
    )
  })

  it('includes the authentication token in the request', async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ darkMode: false }),
    })

    await updateDarkMode(user, false)

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/dark-mode',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      }),
    )
  })

  it('returns the API response when the request succeeds', async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    }

    const responseData = { darkMode: true }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseData,
    })

    const result = await updateDarkMode(user, true)

    expect(result).toEqual(responseData)
  })

  it('throws the API error when the request fails', async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Failed to update dark mode',
      }),
    })

    await expect(updateDarkMode(user, true))
      .rejects
      .toThrow('Failed to update dark mode')
  })

  it('throws the default error when the API does not provide an error message', async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    await expect(updateDarkMode(user, true))
      .rejects
      .toThrow('Failed to update dark mode')
  })
})