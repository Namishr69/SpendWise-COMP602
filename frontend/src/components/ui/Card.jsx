import './Card.css'

function Card({ children, tone = 'cream', className = '', ...rest }) {
  return (
    <div className={`sw-card sw-card--${tone} ${className}`} {...rest}>
      {children}
    </div>
  )
}

export default Card