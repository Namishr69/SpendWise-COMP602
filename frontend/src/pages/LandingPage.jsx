import './LandingPage.css'
import { Link } from 'react-router-dom'

// Small inline logo mark, matching the sprout used elsewhere in the app.
function LogoMark() {
    return (
        <svg
            className="landing-logo__mark"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M12 21c0-4 0-6-1.5-7.5S6 12 6 9c3 0 4.5.5 6 2m0 10c0-5 0-7.5 1.5-9S18 8 18 5c-3 0-4.5.5-6 2v14Z"
                fill="currentColor"
            />
        </svg>
    )
}

const FEATURES = [
    {
        label: 'Track subscriptions',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        label: 'Free trial alerts',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" stroke="currentColor" strokeWidth="1.6" />
            </svg>
        ),
    },
    {
        label: 'Monthly spending summary',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 3 4 6v6c0 4.4 3.2 7.9 8 9 4.8-1.1 8-4.6 8-9V6l-8-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
]

function LandingPage() {
    return (
        <div className="landing-page">
            <div className="landing-left">
                <header className="landing-header">
                    <div className="landing-logo">
                        <LogoMark />
                        <span>SpendWise</span>
                    </div>
                    <div className="landing-nav">
                        <Link to="/signup" className="landing-cta">
                            Signup
                        </Link>
                        <Link to="/login" className="landing-cta landing-cta--ghost">
                            Login
                        </Link>
                    </div>
                </header>

                <section className="landing-hero">
                    <h1>
                        Tracking<br />
                        Made <span>Simple</span>
                    </h1>
                    <p>See all your bills and subscriptions in one place</p>
                </section>

                <section className="landing-features">
                    <h2 className="landing-features__title">Our features</h2>
                    <div className="landing-features-cards">
                        {FEATURES.map((feature) => (
                            <div key={feature.label} className="landing-feature-card">
                                <span className="landing-feature-card__icon">{feature.icon}</span>
                                <p>{feature.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="landing-footer">
                    <p>© 2026 SpendWise</p>
                </footer>
            </div>

            <div className="landing-right">
                <p className="landing-right__tagline">
                    See exactly where your money goes each month
                </p>
            </div>
        </div>
    )
}

export default LandingPage
