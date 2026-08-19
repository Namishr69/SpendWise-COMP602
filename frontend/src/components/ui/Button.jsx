import './Button.css'

function Button({ children, variant = 'primary', type = 'button', fullWidth = false, ...rest }) {
  const classes = ['sw-button', `sw-button--${variant}`, fullWidth ? 'sw-button--full' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}

export default Button