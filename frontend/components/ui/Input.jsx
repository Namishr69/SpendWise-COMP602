import './Input.css'

function Input({ label, id, error, ...rest }) {
  return (
    <div className="sw-field">
      {label && (
        <label className="sw-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`sw-field__input ${error ? 'sw-field__input--error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <p className="sw-field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

export default Input