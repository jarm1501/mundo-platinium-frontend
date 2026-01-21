import React, { useState } from 'react'
import { forgotAnswer1, forgotAnswer2, forgotReset, forgotStart } from '../api'
import ErrorBox from '../components/ErrorBox'

export default function Forgot() {
  const [usuario, setUsuario] = useState('')
  const [step, setStep] = useState(0)
  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')
  const [a1, setA1] = useState('')
  const [a2, setA2] = useState('')
  const [token, setToken] = useState('')
  const [nuevaClave, setNuevaClave] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onStart(e) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const data = await forgotStart({ usuario })
      setQ1(data.q1 || '')
      setQ2(data.q2 || '')
      setStep(Number(data.step || 1))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onAnswer1(e) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const data = await forgotAnswer1({ usuario, a1 })
      if (data?.q2) setQ2(data.q2)
      setStep(Number(data.step || 2))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onAnswer2(e) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const data = await forgotAnswer2({ usuario, a2 })
      setToken(data.token)
      setStep(Number(data.step || 3))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onReset(e) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const data = await forgotReset({ token, nueva_clave: nuevaClave })
      setResult(data)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="login-container">
        <h2>Recuperar contraseña</h2>

        {step === 0 ? (
          <form onSubmit={onStart}>
            <input placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            <button type="submit" disabled={busy}>Empezar</button>
          </form>
        ) : null}

        {step === 1 ? (
          <form onSubmit={onAnswer1}>
            <div style={{ width: '100%' }}><small>Pregunta 1: {q1}</small></div>
            <input placeholder="Respuesta 1" value={a1} onChange={(e) => setA1(e.target.value)} />
            <button type="submit" disabled={busy}>Enviar</button>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={onAnswer2}>
            <div style={{ width: '100%' }}><small>Pregunta 2: {q2}</small></div>
            <input placeholder="Respuesta 2" value={a2} onChange={(e) => setA2(e.target.value)} />
            <button type="submit" disabled={busy}>Enviar</button>
          </form>
        ) : null}

        {step === 3 ? (
          <form onSubmit={onReset}>
            <input placeholder="Token (auto)" value={token} onChange={(e) => setToken(e.target.value)} />
            <input placeholder="Nueva contraseña (mín 8)" type="password" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} />
            <button type="submit" disabled={busy}>Cambiar contraseña</button>
          </form>
        ) : null}
      </div>

      <ErrorBox error={error} />

      {result ? (
        <div style={{ marginTop: 12 }}>
          <h3>Resultado</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  )
}
