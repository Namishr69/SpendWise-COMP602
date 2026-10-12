/**
 * Where a subscription came from, as a short badge label.
 *
 * Auto-detected subscriptions carry a `source` marker written by the backend
 * ('anz-detected' from the bank sync, 'gmail-detected' from the inbox scan).
 * Subscriptions the user typed in themselves carry no marker at all — that
 * absence is what identifies them, so it can't be expressed as a plain lookup.
 *
 * An unrecognised source returns null rather than guessing, so a future source
 * added on the backend shows no badge instead of being mislabelled as manual.
 */
const SOURCE_LABELS = {
  'gmail-detected': 'From email',
  'anz-detected': 'From bank',
  manual: 'Manually added',
}

export function sourceLabel(source) {
  if (!source) return 'Manually added'
  return SOURCE_LABELS[source] || null
}

export default sourceLabel
