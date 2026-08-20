import './AuthLayout.css'

function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__brand">
        <div className="auth-layout__logo">🌱 SpendWise</div>
        <h1>Tracking Made Simple</h1>
        <p>See all your bills and subscriptions in one place</p>
      </div>
      <div className="auth-layout__form">{children}</div>
    </div>
  )
}

export default AuthLayout