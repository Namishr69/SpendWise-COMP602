// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { AuthContext } from '../context/authContext.js'
import { useDismissedAlerts } from './useDismissedAlerts.js'

function signedInAs(uid) {
  return ({ children }) => (
    <AuthContext.Provider value={{ currentUser: { uid } }}>
      {children}
    </AuthContext.Provider>
  )
}

afterEach(() => {
  localStorage.clear()
})

describe('useDismissedAlerts', () => {
  it('remembers a dismissed alert for the same user', () => {
    const first = renderHook(() => useDismissedAlerts(), {
      wrapper: signedInAs('user-1'),
    })

    act(() => first.result.current.dismiss('budget-2026-10'))
    expect(first.result.current.dismissed).toEqual(['budget-2026-10'])

    const again = renderHook(() => useDismissedAlerts(), {
      wrapper: signedInAs('user-1'),
    })
    expect(again.result.current.dismissed).toEqual(['budget-2026-10'])
  })

  it('keeps each user’s dismissals separate', () => {
    const one = renderHook(() => useDismissedAlerts(), {
      wrapper: signedInAs('user-1'),
    })
    act(() => one.result.current.dismiss('budget-2026-10'))

    const two = renderHook(() => useDismissedAlerts(), {
      wrapper: signedInAs('user-2'),
    })
    expect(two.result.current.dismissed).toEqual([])
  })

  it('starts empty when the stored value is unreadable', () => {
    localStorage.setItem('spendwise.dismissedAlerts.user-1', 'not json')

    const { result } = renderHook(() => useDismissedAlerts(), {
      wrapper: signedInAs('user-1'),
    })
    expect(result.current.dismissed).toEqual([])
  })
})
