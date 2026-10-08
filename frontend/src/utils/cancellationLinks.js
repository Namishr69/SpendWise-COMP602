// Curated database of merchant cancellation / manage-subscription links.
//
// A detected (or manually-added) subscription only carries a `name` — there is
// no merchant id, category or logo stored on it — so we look up cancellation
// links by matching that name against the keywords below. Entries are the
// official "cancel" or "manage subscription" pages for well-known merchants.
//
// This list is intentionally small and easy to extend: add an entry with the
// merchant's keyword(s) and its official cancellation URL. Any subscription
// whose name does not match an entry falls back to a "no link" message in the
// UI rather than showing a broken link.
export const CANCELLATION_MERCHANTS = [
  // --- Streaming ---
  {
    label: 'Netflix',
    url: 'https://www.netflix.com/cancelplan',
    keywords: ['netflix'],
  },
  {
    label: 'Spotify',
    url: 'https://www.spotify.com/account/subscription/',
    keywords: ['spotify'],
  },
  {
    label: 'Disney+',
    url: 'https://www.disneyplus.com/account/subscription',
    keywords: ['disney'],
  },
  {
    label: 'YouTube Premium',
    url: 'https://www.youtube.com/paid_memberships',
    keywords: ['youtube'],
  },
  {
    label: 'Twitch',
    url: 'https://www.twitch.tv/settings/subscriptions',
    keywords: ['twitch'],
  },
  {
    label: 'Paramount+',
    url: 'https://www.paramountplus.com/account/',
    keywords: ['paramount'],
  },
  {
    label: 'Apple TV+',
    url: 'https://tv.apple.com/settings',
    keywords: ['apple tv'],
  },
  // --- NZ-specific services ---
  {
    label: 'Neon NZ',
    url: 'https://www.neontv.co.nz/account',
    keywords: ['neon nz', 'neon tv', 'neon'],
  },
  {
    label: 'Spark NZ',
    url: 'https://www.spark.co.nz/shop/account/myaccount/',
    keywords: ['spark nz', 'spark'],
  },
  {
    label: 'One NZ',
    url: 'https://www.one.nz/my-account/',
    keywords: ['one nz', 'one new zealand', 'vodafone nz'],
  },
  {
    label: 'Sky TV NZ',
    url: 'https://www.sky.co.nz/my-sky',
    keywords: ['sky tv', 'sky nz', 'sky sport'],
  },
  // --- Gaming ---
  {
    label: 'Xbox / Game Pass',
    url: 'https://account.microsoft.com/services',
    keywords: ['xbox', 'game pass'],
  },
  {
    label: 'PlayStation Plus',
    url: 'https://www.playstation.com/en-nz/playstation-plus/',
    keywords: ['playstation', 'ps plus', 'playstation plus', 'psn'],
  },
  {
    label: 'Nintendo Switch Online',
    url: 'https://accounts.nintendo.com/profile/settings',
    keywords: ['nintendo'],
  },
  {
    label: 'Steam',
    url: 'https://store.steampowered.com/account/subscriptions',
    keywords: ['steam'],
  },
  // --- Productivity & cloud ---
  {
    label: 'Apple',
    url: 'https://apps.apple.com/account/subscriptions',
    keywords: ['apple', 'itunes', 'app store'],
  },
  {
    label: 'Microsoft 365',
    url: 'https://account.microsoft.com/services',
    keywords: ['microsoft', 'office 365'],
  },
  {
    label: 'Adobe',
    url: 'https://account.adobe.com/plans',
    keywords: ['adobe'],
  },
  {
    label: 'Dropbox',
    url: 'https://www.dropbox.com/account/plan',
    keywords: ['dropbox'],
  },
  {
    label: 'Google One',
    url: 'https://one.google.com/settings',
    keywords: ['google one'],
  },
  {
    label: 'Notion',
    url: 'https://www.notion.so/profile/billing',
    keywords: ['notion'],
  },
  {
    label: 'Canva',
    url: 'https://www.canva.com/settings/billing',
    keywords: ['canva'],
  },
  {
    label: 'Slack',
    url: 'https://slack.com/account/settings',
    keywords: ['slack'],
  },
  {
    label: 'Zoom',
    url: 'https://zoom.us/billing',
    keywords: ['zoom'],
  },
  {
    label: 'GitHub',
    url: 'https://github.com/settings/billing',
    keywords: ['github'],
  },
  // --- Reading & media ---
  {
    label: 'Audible',
    url: 'https://www.audible.com/account/overview',
    keywords: ['audible'],
  },
  {
    label: 'Substack',
    url: 'https://substack.com/account/billing',
    keywords: ['substack'],
  },
  {
    label: 'Patreon',
    url: 'https://www.patreon.com/settings/memberships',
    keywords: ['patreon'],
  },
  // --- Fitness ---
  {
    label: 'Les Mills',
    url: 'https://www.lesmills.com/nz/ondemand/account/',
    keywords: ['les mills'],
  },
  // --- E-commerce & shopping ---
  {
    label: 'Amazon Prime',
    url: 'https://www.amazon.com/gp/primecentral',
    keywords: ['amazon prime', 'prime video'],
  },
  // --- Food delivery ---
  {
    label: 'Uber Eats',
    url: 'https://www.ubereats.com/nz/settings',
    keywords: ['uber eats', 'ubereats'],
  },
  {
    label: 'Uber',
    url: 'https://www.uber.com/nz/en/r/account/',
    keywords: ['uber'],
  },
]

// Lowercase, strip punctuation/symbols, collapse whitespace. Keeps digits so
// names like "Office 365" still match. Mirrors the spirit of the backend's
// merchant normalisation used during subscription detection.
function normaliseName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// True when `keyword` appears in `normalisedName` as a whole word (or, for
// multi-word keywords, as a contiguous run of words). Word-boundary matching
// stops "apple" from matching "pineapple" while still matching "apple services".
function phraseMatches(normalisedName, keyword) {
  const nameTokens = normalisedName.split(' ')
  const keywordTokens = keyword.split(' ')

  for (let i = 0; i + keywordTokens.length <= nameTokens.length; i += 1) {
    let allMatch = true

    for (let j = 0; j < keywordTokens.length; j += 1) {
      if (nameTokens[i + j] !== keywordTokens[j]) {
        allMatch = false
        break
      }
    }

    if (allMatch) {
      return true
    }
  }

  return false
}

// Returns the official cancellation URL for a subscription name, or `null` when
// no curated link is known (the UI shows a fallback message in that case).
export function getCancellationLink(name) {
  const normalised = normaliseName(name)

  if (!normalised) {
    return null
  }

  const match = CANCELLATION_MERCHANTS.find((merchant) =>
    merchant.keywords.some((keyword) => phraseMatches(normalised, keyword))
  )

  return match ? match.url : null
}
