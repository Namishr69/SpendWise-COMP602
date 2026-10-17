// Tests for the subscription cancellation-link lookup.
//
// Run with Vitest:
//   npm test            (from the frontend/ directory)
//
// These cover the user story's acceptance criteria directly:
//   * a subscription with a known merchant shows a working cancellation link
//   * a subscription with no known link gets null -> UI shows a fallback, not
//     a broken link
import { test } from 'vitest'
import assert from 'node:assert/strict'

import { CANCELLATION_MERCHANTS, getCancellationLink, resolveCancellation } from './cancellationLinks.js'

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

// --- resolveCancellation: official link, else a search fallback -------------

test('a curated merchant resolves to its official link', () => {
  assert.deepEqual(resolveCancellation('Netflix'), {
    kind: 'official',
    url: 'https://www.netflix.com/cancelplan',
  })
})

test('an uncurated merchant resolves to a search instead of a dead end', () => {
  // The gyms that prompted this: not in the curated list, and most have no
  // self-service cancel page to curate.
  for (const name of ['Flex Fitness', 'City Fitness', 'CityFitness', 'Jetts']) {
    const result = resolveCancellation(name)
    assert.equal(result.kind, 'search', `${name} should fall back to a search`)
    assert.match(result.url, /^https:\/\/www\.google\.com\/search\?q=/)
    assert.doesNotThrow(() => new URL(result.url))
  }
})

test('the search query carries the merchant name, url-encoded', () => {
  const { url } = resolveCancellation('City Fitness')
  assert.match(url, /City\+Fitness|City%20Fitness/)
  assert.match(decodeURIComponent(url), /City Fitness cancel subscription/)
})

test('a search fallback never claims to be the official link', () => {
  // The UI labels these differently, so the kinds must not be conflated.
  assert.notEqual(resolveCancellation('Flex Fitness').kind, 'official')
  // And the curated lookup itself is unchanged — still null for the unlisted.
  assert.equal(getCancellationLink('Flex Fitness'), null)
})

test('resolveCancellation returns null when there is no usable name', () => {
  assert.equal(resolveCancellation(''), null)
  assert.equal(resolveCancellation('   '), null)
  assert.equal(resolveCancellation(undefined), null)
  assert.equal(resolveCancellation(null), null)
})
