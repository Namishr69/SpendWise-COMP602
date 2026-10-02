// Tests for the subscription cancellation-link lookup.
//
// Run with Node's built-in test runner (no extra tooling needed):
//   npm test            (from the frontend/ directory)
//   node --test         (equivalent)
//
// These cover the user story's acceptance criteria directly:
//   * a subscription with a known merchant shows a working cancellation link
//   * a subscription with no known link gets null -> UI shows a fallback, not
//     a broken link
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CANCELLATION_MERCHANTS, getCancellationLink } from './cancellationLinks.js'

// --- A known merchant returns a working cancellation link --------------------

test('returns the official cancellation link for a known merchant', () => {
  assert.equal(
    getCancellationLink('Netflix'),
    'https://www.netflix.com/cancelplan'
  )
})

test('matching is case-insensitive and ignores surrounding whitespace', () => {
  const expected = 'https://www.netflix.com/cancelplan'
  assert.equal(getCancellationLink('NETFLIX'), expected)
  assert.equal(getCancellationLink('  netflix  '), expected)
})

test('matches ANZ-detected names that carry extra words or symbols', () => {
  // These are the shapes the detector actually produces for sandbox data.
  assert.equal(
    getCancellationLink('Disney+'),
    'https://www.disneyplus.com/account/subscription'
  )
  assert.equal(
    getCancellationLink('YouTube Premium'),
    'https://www.youtube.com/paid_memberships'
  )
  assert.equal(
    getCancellationLink('Apple Services'),
    'https://apps.apple.com/account/subscriptions'
  )
})

test('every known merchant resolves to a valid https link', () => {
  for (const merchant of CANCELLATION_MERCHANTS) {
    const url = getCancellationLink(merchant.keywords[0])
    assert.ok(url, `expected a link for "${merchant.label}"`)
    assert.match(url, /^https:\/\//, `link for "${merchant.label}" must be https`)
    // A valid, parseable URL -> guards the database against broken links.
    assert.doesNotThrow(() => new URL(url))
  }
})

// --- An unknown merchant returns null so the UI can show a fallback ----------

test('returns null for a merchant with no known cancellation link', () => {
  assert.equal(getCancellationLink("Joe's Corner Store"), null)
  // Real ANZ-catalog merchants we deliberately do not have a link for:
  assert.equal(getCancellationLink('Substack'), null)
  assert.equal(getCancellationLink('Les Mills Gym'), null)
})

test('does not match on partial words (no false positives)', () => {
  // "apple" must not match inside "pineapple".
  assert.equal(getCancellationLink('Pineapple Co'), null)
})

test('returns null for missing or empty names without throwing', () => {
  assert.equal(getCancellationLink(''), null)
  assert.equal(getCancellationLink('   '), null)
  assert.equal(getCancellationLink(undefined), null)
  assert.equal(getCancellationLink(null), null)
})
