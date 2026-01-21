import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api";
import ErrorBox from "../components/ErrorBox";

export default function Login() {
  const nav = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const [now, setNow] = useState(() => Date.now());
  const locked = now < lockedUntil;
  const lockLeft = useMemo(() => {
    return Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  }, [lockedUntil, now]);

  useEffect(() => {
    // Fuerza re-render mientras esté en cooldown para que el contador baje.
    if (!locked) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [locked]);

  async function submit(e) {
    e.preventDefault();
    if (locked) return;

    setError("");
    setLoading(true);
    try {
      const u = usuario.trim();
      const p = clave;

      if (!u || !p) {
        setError("faltan_credenciales");
        return;
      }

      const r = await login({ username: u, password: p });
      if ((r?.estado || "") === "pendiente") nav("/cuenta", { replace: true });
      else nav("/", { replace: true });
    } catch (e2) {
      // Nuestro wrapper (src/api.js) lanza Error con { status, data, code }
      setError(e2);

      const nextFails = fails + 1;
      setFails(nextFails);

      if (e2?.status === 429 || e2?.code === "RATE_LIMIT") {
        setLockedUntil(Date.now() + 60_000);
        setNow(Date.now());
        return;
      }

      if (nextFails >= 5) {
        const ms = nextFails >= 7 ? 60_000 : 30_000;
        setLockedUntil(Date.now() + ms);
        setNow(Date.now());
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card pad" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="h1">Acceso</div>
      <p className="muted" style={{ marginTop: 6 }}>
        Ingresa con tu cuenta autorizada.
      </p>

      <div className="card pad panel" style={{ marginTop: 10 }}>
        <div className="muted">
          Este acceso es exclusivo para empleados, supervisores y personal autorizado.
          Si eres cliente o público general, esta sección no es para ti.
        </div>
      </div>

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: "pointer" }}><strong>¿Necesitas ayuda?</strong></summary>
        <div className="muted" style={{ marginTop: 8 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Si no tienes cuenta, usa “Crear cuenta” para solicitar acceso (solo personal).</li>
            <li>Si olvidaste la clave, usa “Olvidé mi clave”.</li>
            <li>Si se activa el cooldown, espera y vuelve a intentar.</li>
          </ul>
        </div>
      </details>

      <form onSubmit={submit} style={{ marginTop: 10 }}>
        <label className="muted">Usuario</label>
        <input
          className="input"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          disabled={locked || loading}
        />

        <div style={{ height: 10 }} />
        <label className="muted">Clave</label>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            type={show ? "text" : "password"}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password"
            disabled={locked || loading}
          />
          <button
            className="btn"
            type="button"
            onClick={() => setShow((v) => !v)}
            disabled={locked || loading}
          >
            {show ? "Ocultar" : "Ver"}
          </button>
        </div>

        <div
          className="row"
          style={{ gap: 10, marginTop: 12, alignItems: "center" }}
        >
          <button className="btn primary" disabled={loading || locked} type="submit">
            {locked ? `Espera ${lockLeft}s` : loading ? "Entrando..." : "Entrar"}
          </button>
          {fails ? <span className="muted">Intentos: {fails}</span> : null}
        </div>

        <ErrorBox error={error} />
        {locked ? (
          <div className="muted" style={{ marginTop: 6 }}>
            Demasiados intentos. Espera un momento y vuelve a intentar.
          </div>
        ) : null}

        <div className="row between" style={{ marginTop: 12 }}>
          <Link to="/registro" className="muted">
            Solicitar acceso
          </Link>
          <Link to="/olvide" className="muted">
            Olvidé mi clave
          </Link>
        </div>
      </form>
    </div>
  );
}
