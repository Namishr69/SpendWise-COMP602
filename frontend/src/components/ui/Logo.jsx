// SpendWise logo, traced from public/logo.png so it stays sharp at any size.
// Fills with currentColor, so each placement sets its colour with CSS `color`.
function Logo({ className = '', height = 24 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 34 43"
      height={height}
      width={(height * 34) / 43}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Ring with a V-shaped collar notch at the bottom. */}
      <path d="M5.78 29.04A16.5 16.5 0 1 1 27.22 29.04L20.78 22.41A7.3 7.3 0 1 0 12.22 22.41Z" />
      {/* Tie. */}
      <path d="M14 24H19L19.5 28L21.6 37.5L16.5 43L11.4 37.5L13.5 28Z" />
    </svg>
  )
}

export default Logo
