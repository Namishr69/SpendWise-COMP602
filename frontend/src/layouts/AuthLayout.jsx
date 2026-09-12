import './AuthLayout.css'

function AuthLayout({ children, variant = 'dark' }) {
  return (
    <div className={`auth-shell auth-shell--${variant}`}>
      <div className="auth-shell__logo">
        <svg className="auth-shell__logo-mark" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2C9 6 8 9 8 12c0 1.2.3 2.3.9 3.2C6.6 15 5 13.2 5 10c-2 2.4-2 6.3.4 8.6C7 20.2 9.4 21 12 21s5-.8 6.6-2.4C21 16.3 21 12.4 19 10c0 3.2-1.6 5-3.9 5.2.6-.9.9-2 .9-3.2 0-3-1-6-4-10Z"
          />
        </svg>
        SpendWise
      </div>
      <div className="auth-shell__panel">
        <main className="auth-shell__content">{children}</main>
      </div>
    </div>
  )
}

export default AuthLayout
