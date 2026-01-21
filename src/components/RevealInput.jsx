import React, { useId, useState } from 'react'

export default function RevealInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  inputClassName = 'input',
  buttonClassName = 'btn',
  typeWhenHidden = 'password'
}) {
  const [show, setShow] = useState(false)
  const id = useId()

  return (
    <div>
      {label ? (
        <label className="muted" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="row" style={{ gap: 8 }}>
        <input
          id={id}
          className={inputClassName}
          type={show ? 'text' : typeWhenHidden}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          className={buttonClassName}
          type="button"
          onClick={() => setShow((v) => !v)}
          disabled={disabled}
        >
          {show ? 'Ocultar' : 'Ver'}
        </button>
      </div>
    </div>
  )
}
