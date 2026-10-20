import { useContext, useState } from 'react'

import { AuthContext } from '../context/authContext.js'

const KEY_PREFIX = 'spendwise.dismissedAlerts.'

function readDismissed(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key))
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

/**
 * Alert ids the signed-in user has dismissed, kept in this browser's
 * localStorage per user. Alert ids carry the date they are about (e.g.
 * "dueSoon-<id>-2026-10-22"), so dismissing one doesn't hide next month's.
 */
export function useDismissedAlerts() {
  const uid =
    useContext(AuthContext)?.currentUser?.uid || 'signed-out'

  const key = `${KEY_PREFIX}${uid}`

  const [dismissed, setDismissed] = useState(() =>
    readDismissed(key),
  )

  function dismiss(id) {
    if (dismissed.includes(id)) return

    const next = [...dismissed, id]
    setDismissed(next)

    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Storage blocked (e.g. private mode): the dismissal lasts until reload.
    }
  }

  return { dismissed, dismiss }
}
