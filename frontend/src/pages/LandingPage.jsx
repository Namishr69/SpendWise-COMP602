import './LandingPage.css'

import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

import {
  useTranslations,
} from '../hooks/useTranslations.js'
import {
  EASE_OUT,
  SPRING,
  fadeUp,
  hoverLift,
  stagger,
} from '../components/ui/motionPresets.js'
import Logo from '../components/ui/Logo.jsx'

const MotionLink = motion.create(Link)

// Abstract subscription cards for the sage panel. Shapes only, so there is
// no copy to translate. Each one bobs on its own rhythm.
const PREVIEW_CARDS = [
  { dot: 'var(--color-gold)', width: '62%', offset: 0, duration: 6 },
  { dot: 'var(--color-forest)', width: '48%', offset: 48, duration: 7 },
  { dot: 'var(--color-cream)', width: '70%', offset: 12, duration: 6.5 },
]

const LANDING_TEXT = [
  'Sign up',
  'Login',
  'Tracking',
  'Made',
  'Simple',
  'See all your bills and subscriptions in one place',
  'Our features',
  'Track subscriptions',
  'Free trial alerts',
  'Monthly spending summary',
  'See exactly where your money goes each month',
]

function LandingPage() {
  const [
    signupText,
    loginText,
    trackingText,
    madeText,
    simpleText,
    descriptionText,
    featuresTitleText,
    trackSubscriptionsText,
    freeTrialAlertsText,
    monthlySummaryText,
    taglineText,
  ] = useTranslations(
    LANDING_TEXT,
  )

  const features = [
    {
      label: trackSubscriptionsText,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: freeTrialAlertsText,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.6"
          />

          <path
            d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      ),
    },
    {
      label: monthlySummaryText,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 3 4 6v6c0 4.4 3.2 7.9 8 9 4.8-1.1 8-4.6 8-9V6l-8-3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          <path
            d="m9 12 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ]

  return (
    <div className="landing-page">
      <motion.div
        className="landing-left"
        variants={stagger(0.05, 0.08)}
        initial="hidden"
        animate="show"
      >
        <motion.header
          className="landing-header"
          variants={fadeUp}
        >
          <div className="landing-logo">
            <Logo
              className="landing-logo__mark"
              height={44}
            />
            <span>SpendWise</span>
          </div>

          <div className="landing-nav">
            <MotionLink
              to="/signup"
              className="landing-cta"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING}
            >
              {signupText}
            </MotionLink>

            <MotionLink
              to="/login"
              className="landing-cta landing-cta--ghost"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING}
            >
              {loginText}
            </MotionLink>
          </div>
        </motion.header>

        <motion.section
          className="landing-hero"
          variants={stagger(0, 0.1)}
        >
          <motion.h1 variants={fadeUp}>
            {trackingText}
            <br />

            {madeText}{' '}
            <span className="landing-hero__accent">
              {simpleText}

              {/* Hand-drawn underline that draws itself in. */}
              <svg
                className="landing-hero__underline"
                viewBox="0 0 200 16"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M3 11C40 4 120 2 197 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.6,
                    ease: EASE_OUT,
                  }}
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p variants={fadeUp}>
            {descriptionText}
          </motion.p>
        </motion.section>

        <motion.section
          className="landing-features"
          variants={stagger(0.1, 0.08)}
        >
          <motion.h2
            className="landing-features__title"
            variants={fadeUp}
          >
            {featuresTitleText}
          </motion.h2>

          <div className="landing-features-cards">
            {features.map(
              (feature) => (
                <motion.div
                  key={feature.label}
                  className="landing-feature-card"
                  variants={fadeUp}
                  whileHover={hoverLift}
                >
                  <span className="landing-feature-card__icon">
                    {feature.icon}
                  </span>

                  <p>
                    {feature.label}
                  </p>
                </motion.div>
              ),
            )}
          </div>
        </motion.section>

        <motion.footer
          className="landing-footer"
          variants={fadeUp}
        >
          <p>
            © 2026 SpendWise
          </p>
        </motion.footer>
      </motion.div>

      <div className="landing-right">
        <motion.p
          className="landing-right__tagline"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.3,
            ease: EASE_OUT,
          }}
        >
          {taglineText}
        </motion.p>

        <motion.div
          className="landing-preview"
          aria-hidden="true"
          variants={stagger(0.5, 0.15)}
          initial="hidden"
          animate="show"
        >
          {PREVIEW_CARDS.map((card) => (
            <motion.div
              key={card.offset}
              variants={fadeUp}
              style={{ marginLeft: card.offset }}
            >
              <motion.div
                className="landing-preview__card"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: card.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <span
                  className="landing-preview__dot"
                  style={{ background: card.dot }}
                />

                <span className="landing-preview__lines">
                  <span style={{ width: card.width }} />
                  <span />
                </span>

                <span className="landing-preview__amount" />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

export default LandingPage