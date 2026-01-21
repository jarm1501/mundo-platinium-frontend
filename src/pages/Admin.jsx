import { useEffect, useMemo, useState } from "react";
import {
	adminAprobarSolicitud,
	adminAuditoria,
	adminIpBan,
	adminIpUnban,
	adminIps,
	adminRechazarSolicitud,
	adminSolicitudes,
	adminUsuarios,
	adminUsuariosCrear,
	adminUsuariosActualizar,
	adminUsuariosGenerarClave,
	adminUsuariosEliminar,
	getUsuario,
} from "../api";

import RevealInput from "../components/RevealInput";

const PAGE_SIZE = 25;

export default function Admin() {
	const [tab, setTab] = useState("usuarios");
	const [tabsCollapsed, setTabsCollapsed] = useState(false);

	// Usuarios (todo)
	const [users, setUsers] = useState([]);
	const [usersLoading, setUsersLoading] = useState(true);
	const [usersError, setUsersError] = useState("");
	const [filter, setFilter] = useState("");
	const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, page_size: PAGE_SIZE, total: 0 });

	// Pendientes
	const [pending, setPending] = useState([]);
	const [pendingLoading, setPendingLoading] = useState(false);
	const [pendingError, setPendingError] = useState("");
	const [pendingPage, setPendingPage] = useState({ page: 1, pages: 1, page_size: PAGE_SIZE, total: 0 });

	// Rechazados
	const [rejected, setRejected] = useState([]);
	const [rejectedLoading, setRejectedLoading] = useState(false);
	const [rejectedError, setRejectedError] = useState("");
	const [rejectedFilter, setRejectedFilter] = useState("");
	const [rejectedPage, setRejectedPage] = useState({ page: 1, pages: 1, page_size: PAGE_SIZE, total: 0 });

	// Auditoría
	const [audit, setAudit] = useState([]);
	const [auditLoading, setAuditLoading] = useState(false);
	const [auditError, setAuditError] = useState("");
	const [auditPage, setAuditPage] = useState({ page: 1, pages: 1, page_size: PAGE_SIZE, total: 0 });
	const [auditSortKey, setAuditSortKey] = useState("ts");
	const [auditSortDir, setAuditSortDir] = useState("desc");

	// Orden (tablas)
	const [activeSortKey, setActiveSortKey] = useState("id");
	const [activeSortDir, setActiveSortDir] = useState("asc");
	const [pendingSortKey, setPendingSortKey] = useState("id");
	const [pendingSortDir, setPendingSortDir] = useState("asc");
	const [rejectedSortKey, setRejectedSortKey] = useState("id");
	const [rejectedSortDir, setRejectedSortDir] = useState("asc");

	// IPs
	const [ips, setIps] = useState([]);
	const [ipsLoading, setIpsLoading] = useState(false);
	const [ipsError, setIpsError] = useState("");

	// Crear cuenta (admin)
	const [createForm, setCreateForm] = useState({
		usuario: "",
		nombre: "",
		apellido: "",
		fecha_nacimiento: "",
		email: "",
		telefono: "",
		estado: "activo",
		nivel: 1,
		clave: "",
		sec_q1: "",
		sec_a1: "",
		sec_q2: "",
		sec_a2: "",
	});
	const [createPwMode, setCreatePwMode] = useState("auto"); // auto | manual
	const [createBusy, setCreateBusy] = useState(false);
	const [createErr, setCreateErr] = useState("");
	const [createOk, setCreateOk] = useState("");
	const [createdPassword, setCreatedPassword] = useState("");

	async function refreshUsers({ q = filter, page = 1 } = {}) {
		setUsersLoading(true);
		setUsersError("");
		try {
			// En "Activos" no deben aparecer pendientes ni rechazados.
			const data = await adminUsuarios({ estado: "activo", q, page, page_size: PAGE_SIZE });
			setUsers(Array.isArray(data?.items) ? data.items : []);
			setPageInfo(data?.page || { page: 1, pages: 1, page_size: PAGE_SIZE, total: 0 });
		} catch (e) {
			setUsersError(e?.message || "No se pudo cargar la lista de usuarios.");
		} finally {
			setUsersLoading(false);
		}
	}

	async function refreshPendientes({ page = 1 } = {}) {
		setPendingLoading(true);
		setPendingError("");
		try {
			const data = await adminSolicitudes({ page, page_size: PAGE_SIZE });
			setPending(Array.isArray(data?.items) ? data.items : []);
			setPendingPage(data?.page || { page: 1, pages: 1, page_size: PAGE_SIZE, total: 0 });
		} catch (e) {
			setPendingError(e?.message || "No se pudo cargar pendientes.");
		} finally {
			setPendingLoading(false);
		}
	}

	async function refreshRechazados({ q = rejectedFilter, page = 1 } = {}) {
		setRejectedLoading(true);
		setRejectedError("");
		try {
			const data = await adminUsuarios({ estado: "rechazado", q, page, page_size: PAGE_SIZE });
			setRejected(Array.isArray(data?.items) ? data.items : []);
			setRejectedPage(data?.page || { page: 1, pages: 1, page_size: PAGE_SIZE, total: 0 });
		} catch (e) {
			setRejectedError(e?.message || "No se pudo cargar rechazados.");
		} finally {
			setRejectedLoading(false);
		}
	}

	async function refreshAuditoria({ page = 1 } = {}) {
		setAuditLoading(true);
		setAuditError("");
		try {
			const data = await adminAuditoria({ page, page_size: PAGE_SIZE });
			setAudit(Array.isArray(data?.items) ? data.items : []);
			setAuditPage(data?.page || { page: 1, pages: 1, page_size: PAGE_SIZE, total: 0 });
		} catch (e) {
			setAuditError(e?.message || "No se pudo cargar auditoría.");
		} finally {
			setAuditLoading(false);
		}
	}

	async function refreshIps() {
		setIpsLoading(true);
		setIpsError("");
		try {
			const data = await adminIps();
			setIps(Array.isArray(data?.items) ? data.items : []);
		} catch (e) {
			setIpsError(e?.message || "No se pudo cargar IPs.");
		} finally {
			setIpsLoading(false);
		}
	}

	useEffect(() => {
		refreshUsers({ q: "", page: 1 });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (tab === "pendientes" && pending.length === 0) refreshPendientes({ page: 1 });
		if (tab === "rechazados" && rejected.length === 0) refreshRechazados({ q: "", page: 1 });
		if (tab === "auditoria" && audit.length === 0) refreshAuditoria({ page: 1 });
		if (tab === "ips" && ips.length === 0) refreshIps();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab]);

	const filtered = useMemo(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return users;
		return users.filter((u) => {
			return (
				String(u.username || "").toLowerCase().includes(q) ||
				String(u.email || "").toLowerCase().includes(q) ||
				String(u.nombre || "").toLowerCase().includes(q) ||
				String(u.apellido || "").toLowerCase().includes(q) ||
				String(u.telefono || "").toLowerCase().includes(q)
			);
		});
	}, [users, filter]);

	const collator = useMemo(() => new Intl.Collator("es", { numeric: true, sensitivity: "base" }), []);
	function cmp(a, b, dir, type) {
		const av = a ?? null;
		const bv = b ?? null;
		if (av === null && bv === null) return 0;
		if (av === null) return dir === "asc" ? 1 : -1;
		if (bv === null) return dir === "asc" ? -1 : 1;
		const out = type === "number" ? Number(av) - Number(bv) : collator.compare(String(av), String(bv));
		return dir === "asc" ? out : -out;
	}

	const activeSorted = useMemo(() => {
		const map = {
			id: { type: "number", get: (u) => u.id },
			username: { type: "string", get: (u) => u.username },
			nombre: { type: "string", get: (u) => u.nombre },
			apellido: { type: "string", get: (u) => u.apellido },
			nivel: { type: "number", get: (u) => u.nivel },
		};
		const spec = map[activeSortKey] || map.id;
		return [...(filtered || [])].sort((a, b) => cmp(spec.get(a), spec.get(b), activeSortDir, spec.type));
	}, [filtered, activeSortKey, activeSortDir]);

	const pendingSorted = useMemo(() => {
		const map = {
			id: { type: "number", get: (u) => u.id },
			username: { type: "string", get: (u) => u.username },
			nombre: { type: "string", get: (u) => u.nombre },
			apellido: { type: "string", get: (u) => u.apellido },
		};
		const spec = map[pendingSortKey] || map.id;
		return [...(pending || [])].sort((a, b) => cmp(spec.get(a), spec.get(b), pendingSortDir, spec.type));
	}, [pending, pendingSortKey, pendingSortDir]);

	const rejectedSorted = useMemo(() => {
		const map = {
			id: { type: "number", get: (u) => u.id },
			username: { type: "string", get: (u) => u.username },
			nombre: { type: "string", get: (u) => u.nombre },
			apellido: { type: "string", get: (u) => u.apellido },
		};
		const spec = map[rejectedSortKey] || map.id;
		return [...(rejected || [])].sort((a, b) => cmp(spec.get(a), spec.get(b), rejectedSortDir, spec.type));
	}, [rejected, rejectedSortKey, rejectedSortDir]);

	const auditSorted = useMemo(() => {
		const map = {
			id: { type: "number", get: (a) => a.id },
			ts: { type: "string", get: (a) => a.ts },
			actor: { type: "string", get: (a) => a.actor },
			actor_id: { type: "number", get: (a) => a.actor_id },
			action: { type: "string", get: (a) => a.action },
			entity: { type: "string", get: (a) => a.entity },
			entity_id: { type: "number", get: (a) => a.entity_id },
		};
		const spec = map[auditSortKey] || map.ts;
		return [...(audit || [])].sort((a, b) => cmp(spec.get(a), spec.get(b), auditSortDir, spec.type));
	}, [audit, auditSortKey, auditSortDir]);

	function confirmTwice(msg1, msg2) {
		if (!window.confirm(msg1)) return false;
		if (!window.confirm(msg2)) return false;
		return true;
	}

	function confirmOnce(msg) {
		return window.confirm(msg);
	}

	function promptAdminPassword() {
		return window.prompt("Confirma tu clave de administrador:") || "";
	}

	function setTabError(msg) {
		if (tab === "pendientes") setPendingError(msg);
		else if (tab === "rechazados") setRejectedError(msg);
		else if (tab === "ips") setIpsError(msg);
		else setUsersError(msg);
	}

	function renderUsernameWithSelfMark(u) {
		const self = getUsuario();
		const uname = u?.username || "";
		if (self && String(uname) === String(self)) return `${uname} (tú)`;
		return uname;
	}

	async function setUserFlags(user, payload) {
		const userId = user?.id;
		const username = user?.username || `ID ${userId}`;
		const wantsEstado = Object.prototype.hasOwnProperty.call(payload || {}, "estado");
		const wantsNivel = Object.prototype.hasOwnProperty.call(payload || {}, "nivel");

		if ((wantsEstado || wantsNivel) && userId) {
			const parts = [];
			if (wantsEstado) parts.push(`estado → ${payload.estado}`);
			if (wantsNivel) parts.push(`rol → ${Number(payload.nivel) === 0 ? "admin" : "usuario"}`);
			const changeTxt = parts.join(", ");
			if (!confirmOnce(`¿Cambiar ${changeTxt} de ${username}?`)) return;
			const adminPwd = promptAdminPassword();
			if (!adminPwd) return;
			payload = { ...(payload || {}), admin_password: adminPwd };
		}

		try {
			await adminUsuariosActualizar(userId, payload);
			await refreshUsers({ q: filter, page: pageInfo.page || 1 });
			if (tab === "rechazados") await refreshRechazados({ q: rejectedFilter, page: rejectedPage.page || 1 });
		} catch (e) {
			setUsersError(e?.message || "No se pudo actualizar el usuario.");
		}
	}

	async function showTempPassword(user) {
		const adminPwd = window.prompt("Confirma tu clave de administrador para generar y ver una clave temporal:");
		if (!adminPwd) return;
		if (!window.confirm(`Esto CAMBIARÁ la clave de ${user.username} por una clave temporal. ¿Continuar?`)) return;
		try {
			const r = await adminUsuariosGenerarClave(user.id, adminPwd);
			const temp = r?.password;
			if (!temp) throw new Error("No se recibió la clave temporal.");

			let copied = false;
			try {
				if (navigator?.clipboard?.writeText) {
					await navigator.clipboard.writeText(temp);
					copied = true;
				}
			} catch {
				copied = false;
			}
			if (!copied) {
				try {
					const ta = document.createElement("textarea");
					ta.value = temp;
					ta.setAttribute("readonly", "");
					ta.style.position = "fixed";
					ta.style.left = "-9999px";
					document.body.appendChild(ta);
					copied = document.execCommand("copy");
					document.body.removeChild(ta);
				} catch {
					copied = false;
				}
			}

			window.alert(
				`Clave temporal de ${user.username}:\n\n${temp}\n\n${copied ? "(Copiada al portapapeles)" : "(No se pudo copiar automáticamente; cópiala manualmente)"}\n\nEsta clave reemplazó la anterior.`
			);
		} catch (e) {
			setUsersError(e?.message || "No se pudo generar la clave temporal.");
		}
	}

	async function removeUser(user) {
		const self = getUsuario();
		if (self && String(user.username || "") === String(self)) {
			setUsersError("No puedes eliminar tu propio usuario desde el panel de administración.");
			return;
		}

		if (!confirmTwice(
			`¿Eliminar a ${user.username}? Esta acción es irreversible.`,
			`Confirmación final: se eliminará a ${user.username}. ¿Continuar?`
		)) return;
		const adminPwd = promptAdminPassword();
		if (!adminPwd) return;
		try {
			await adminUsuariosEliminar(user.id, adminPwd);
			await refreshUsers({ q: filter, page: 1 });
			if (tab === "rechazados") await refreshRechazados({ q: rejectedFilter, page: 1 });
		} catch (e) {
			setUsersError(e?.message || "No se pudo eliminar el usuario.");
		}
	}

	async function banIp(ip) {
		if (!ip) return;
		if (!confirmOnce(`¿Banear IP ${ip}?`)) return;
		const adminPwd = promptAdminPassword();
		if (!adminPwd) return;
		try {
			await adminIpBan(ip, adminPwd);
			await refreshIps();
		} catch (e) {
			setTabError(e?.message || "No se pudo banear la IP.");
		}
	}

	async function unbanIp(ip) {
		if (!ip) return;
		if (!confirmOnce(`¿Limpiar (unban) IP ${ip}?`)) return;
		const adminPwd = promptAdminPassword();
		if (!adminPwd) return;
		try {
			await adminIpUnban(ip, adminPwd);
			await refreshIps();
		} catch (e) {
			setTabError(e?.message || "No se pudo limpiar la IP.");
		}
	}

	async function aprobarSolicitud(u) {
		if (!u?.id) return;
		if (!confirmOnce(`¿Aprobar la solicitud de ${u.username}? (pasará a activo)`)) return;
		const adminPwd = promptAdminPassword();
		if (!adminPwd) return;
		try {
			await adminAprobarSolicitud(u.id, adminPwd);
			await Promise.all([
				refreshPendientes({ page: pendingPage.page || 1 }),
				refreshUsers({ q: filter, page: pageInfo.page || 1 }),
			]);
		} catch (e) {
			setPendingError(e?.message || "No se pudo aprobar.");
		}
	}

	async function rechazarSolicitud(u) {
		if (!u?.id) return;
		if (!confirmOnce(`¿Rechazar la solicitud de ${u.username}? (pasará a rechazado)`)) return;
		const adminPwd = promptAdminPassword();
		if (!adminPwd) return;
		try {
			await adminRechazarSolicitud(u.id, adminPwd);
			await Promise.all([
				refreshPendientes({ page: pendingPage.page || 1 }),
				refreshRechazados({ q: rejectedFilter, page: 1 }),
				refreshUsers({ q: filter, page: pageInfo.page || 1 }),
			]);
			const ip = u.signup_ip || u.last_login_ip;
			if (ip && window.confirm(`Rechazado. ¿Banear la IP ${ip}?`)) {
				try {
					await adminIpBan(ip, adminPwd);
					await refreshIps();
				} catch (e2) {
					setTabError(e2?.message || "No se pudo banear la IP.");
				}
			}
		} catch (e) {
			setPendingError(e?.message || "No se pudo rechazar.");
		}
	}

	function refreshActiveTab() {
		if (tab === "usuarios") return refreshUsers({ q: filter, page: pageInfo.page || 1 });
		if (tab === "pendientes") return refreshPendientes({ page: pendingPage.page || 1 });
		if (tab === "rechazados") return refreshRechazados({ q: rejectedFilter, page: rejectedPage.page || 1 });
		if (tab === "auditoria") return refreshAuditoria({ page: auditPage.page || 1 });
		if (tab === "ips") return refreshIps();
	}

	function setCreateField(key, value) {
		setCreateErr("");
		setCreateOk("");
		setCreatedPassword("");
		setCreateForm((p) => ({ ...p, [key]: value }));
	}

	async function createUser(e) {
		e?.preventDefault?.();
		setCreateErr("");
		setCreateOk("");
		setCreatedPassword("");

		const email = String(createForm.email || "").trim();
		const tel = String(createForm.telefono || "").trim();
		const contactOk = Boolean(email || tel);
		if (!createForm.usuario.trim() || !createForm.nombre.trim() || !createForm.apellido.trim() || !createForm.fecha_nacimiento) {
			setCreateErr("Completa usuario, nombre, apellido y fecha de nacimiento.");
			return;
		}
		if (!contactOk) {
			setCreateErr("Coloca al menos correo o teléfono.");
			return;
		}
		if (createPwMode === "manual" && !createForm.clave) {
			setCreateErr("Escribe una clave o cambia a automática.");
			return;
		}
		if (!createForm.sec_q1.trim() || !createForm.sec_a1.trim() || !createForm.sec_q2.trim() || !createForm.sec_a2.trim()) {
			setCreateErr("Completa 2 preguntas y sus respuestas.");
			return;
		}
		if (createForm.sec_q1.trim().toLowerCase() === createForm.sec_q2.trim().toLowerCase()) {
			setCreateErr("Las preguntas deben ser diferentes.");
			return;
		}

		const username = createForm.usuario.trim();
		if (!confirmOnce(`¿Crear cuenta para ${username}?`)) return;
		const adminPwd = promptAdminPassword();
		if (!adminPwd) return;

		setCreateBusy(true);
		try {
			const payload = {
				admin_password: adminPwd,
				usuario: username,
				nombre: createForm.nombre.trim(),
				apellido: createForm.apellido.trim(),
				fecha_nacimiento: createForm.fecha_nacimiento,
				email: email || null,
				telefono: tel || null,
				estado: createForm.estado,
				nivel: Number(createForm.nivel) === 0 ? 0 : 1,
				sec_q1: createForm.sec_q1.trim(),
				sec_a1: createForm.sec_a1,
				sec_q2: createForm.sec_q2.trim(),
				sec_a2: createForm.sec_a2,
			};
			if (createPwMode === "auto") payload.auto_password = true;
			else payload.clave = createForm.clave;

			const r = await adminUsuariosCrear(payload);
			setCreateOk(`Cuenta creada: ${r?.usuario || username} (ID ${r?.id || "?"}).`);
			setCreatedPassword(String(r?.clave_generada || ""));
			setCreateForm((p) => ({
				...p,
				usuario: "",
				nombre: "",
				apellido: "",
				fecha_nacimiento: "",
				email: "",
				telefono: "",
				clave: "",
				sec_a1: "",
				sec_a2: "",
			}));
			// refrescar lista si quedó activo
			if (String(createForm.estado || "") === "activo") await refreshUsers({ q: filter, page: 1 });
		} catch (e2) {
			setCreateErr(e2?.data?.detail || e2?.detail || e2?.message || "No se pudo crear la cuenta.");
		} finally {
			setCreateBusy(false);
		}
	}

	return (
		<div className="page">
			<div className="card pad" style={{ marginBottom: 12 }}>
				<div className="h1">Administración</div>
				<div className="muted" style={{ marginTop: 6 }}>
					Sección exclusiva para administradores (supervisores/jefes). Aquí se gestionan usuarios, solicitudes, auditoría e IPs.
				</div>
				<details style={{ marginTop: 12 }}>
					<summary style={{ cursor: "pointer" }}><strong>¿Cómo usar esta sección?</strong></summary>
					<div className="muted" style={{ marginTop: 8 }}>
						<ul style={{ margin: 0, paddingLeft: 18 }}>
							<li>Usuarios: activa/banea, cambia rol y gestiona datos.</li>
							<li>Pendientes/Rechazados: revisa solicitudes de acceso.</li>
							<li>Auditoría: revisa acciones registradas para trazabilidad.</li>
							<li>IPs: medidas de seguridad ante abuso o intentos masivos.</li>
						</ul>
					</div>
				</details>
			</div>
			<div className="container">
				<div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 12 }}>
					<h1 style={{ margin: 0 }}>Administración</h1>
					<button className="btn" onClick={refreshActiveTab} disabled={usersLoading || pendingLoading || rejectedLoading || auditLoading || ipsLoading}>
						Recargar
					</button>
				</div>

				<div className={`card sectionTabs ${tabsCollapsed ? "isCollapsed" : ""}`} style={{ marginTop: 12 }}>
					<div className="row sectionTabsHeader" style={{ gap: 10, flexWrap: "wrap", width: '100%' }}>
						{!tabsCollapsed && (
							<div className="row sectionTabsBody" style={{ gap: 10, flexWrap: "wrap" }}>
								<button className={tab === "usuarios" ? "btn primary" : "btn"} onClick={() => setTab("usuarios")} type="button">Activos</button>
								<button className={tab === "pendientes" ? "btn primary" : "btn"} onClick={() => setTab("pendientes")} type="button">Pendientes</button>
								<button className={tab === "rechazados" ? "btn primary" : "btn"} onClick={() => setTab("rechazados")} type="button">Rechazados</button>
								<button className={tab === "auditoria" ? "btn primary" : "btn"} onClick={() => setTab("auditoria")} type="button">Auditoría</button>
								<button className={tab === "ips" ? "btn primary" : "btn"} onClick={() => setTab("ips")} type="button">IPs</button>
								<button className={tab === "crear" ? "btn primary" : "btn"} onClick={() => setTab("crear")} type="button">Crear cuenta</button>
							</div>
						)}
						<button className="btn sectionToggleIcon" onClick={() => setTabsCollapsed((v) => !v)} type="button" aria-label="Mostrar u ocultar secciones" style={{ marginLeft: 'auto' }}>
							{tabsCollapsed ? "▾" : "▴"}
						</button>
					</div>
				</div>

				{tab === "crear" ? (
					<div className="card" style={{ marginTop: 12 }}>
						<div className="h2">Crear cuenta (Admin)</div>
						<div className="muted" style={{ marginTop: 6 }}>
							Crea una cuenta sin pasar por solicitud. Puedes dejarla activa o pendiente.
						</div>

						<form onSubmit={createUser} style={{ marginTop: 12 }}>
							<div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
								<div>
									<label className="muted">Estado</label>
									<select className="input" value={createForm.estado} onChange={(e) => setCreateField('estado', e.target.value)}>
										<option value="activo">Activo</option>
										<option value="pendiente">Pendiente</option>
									</select>
								</div>
								<div>
									<label className="muted">Rol</label>
									<select className="input" value={String(createForm.nivel)} onChange={(e) => setCreateField('nivel', Number(e.target.value) === 0 ? 0 : 1)}>
										<option value="1">Usuario</option>
										<option value="0">Administrador</option>
									</select>
								</div>
							</div>

							<div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
								<div>
									<label className="muted">Usuario</label>
									<input className="input" value={createForm.usuario} onChange={(e) => setCreateField('usuario', e.target.value)} autoComplete="off" />
								</div>
								<div>
									<label className="muted">Fecha de nacimiento</label>
									<input className="input" type="date" value={createForm.fecha_nacimiento} onChange={(e) => setCreateField('fecha_nacimiento', e.target.value)} />
								</div>
								<div>
									<label className="muted">Nombre</label>
									<input className="input" value={createForm.nombre} onChange={(e) => setCreateField('nombre', e.target.value)} />
								</div>
								<div>
									<label className="muted">Apellido</label>
									<input className="input" value={createForm.apellido} onChange={(e) => setCreateField('apellido', e.target.value)} />
								</div>
							</div>

							<div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
								<div>
									<label className="muted">Correo</label>
									<input className="input" value={createForm.email} onChange={(e) => setCreateField('email', e.target.value)} placeholder="Correo" />
								</div>
								<div>
									<label className="muted">Teléfono</label>
									<input className="input" value={createForm.telefono} onChange={(e) => setCreateField('telefono', e.target.value)} placeholder="Teléfono (opcional)" />
								</div>
							</div>

							<div className="card pad panel" style={{ marginTop: 12 }}>
								<div className="h2">Clave</div>
								<div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
									<button className={createPwMode === 'auto' ? 'btn primary' : 'btn'} type="button" onClick={() => setCreatePwMode('auto')}>
										Automática
									</button>
									<button className={createPwMode === 'manual' ? 'btn primary' : 'btn'} type="button" onClick={() => setCreatePwMode('manual')}>
										Manual
									</button>
								</div>

								{createPwMode === 'manual' ? (
									<div style={{ marginTop: 10 }}>
										<RevealInput
											label="Clave"
											value={createForm.clave}
											onChange={(e) => setCreateField('clave', e.target.value)}
											autoComplete="new-password"
										/>
									</div>
								) : (
									<div className="muted" style={{ marginTop: 10 }}>
										Se generará una clave y se mostrará al crear la cuenta.
									</div>
								)}
							</div>

							<div className="card pad panel" style={{ marginTop: 12 }}>
								<div className="h2">Preguntas de seguridad</div>
								<div className="muted" style={{ marginTop: 6 }}>Se usan para recuperación de clave. Deben ser 2.</div>
								<div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 10 }}>
									<div>
										<label className="muted">Pregunta 1</label>
										<input className="input" value={createForm.sec_q1} onChange={(e) => setCreateField('sec_q1', e.target.value)} />
									</div>
									<div>
										<RevealInput
											label="Respuesta 1"
											value={createForm.sec_a1}
											onChange={(e) => setCreateField('sec_a1', e.target.value)}
											autoComplete="off"
										/>
									</div>
									<div>
										<label className="muted">Pregunta 2</label>
										<input className="input" value={createForm.sec_q2} onChange={(e) => setCreateField('sec_q2', e.target.value)} />
									</div>
									<div>
										<RevealInput
											label="Respuesta 2"
											value={createForm.sec_a2}
											onChange={(e) => setCreateField('sec_a2', e.target.value)}
											autoComplete="off"
										/>
									</div>
								</div>
							</div>

							<div className="row" style={{ gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
								<button className="btn primary" type="submit" disabled={createBusy}>
									{createBusy ? 'Creando...' : 'Crear cuenta'}
								</button>
								{createOk ? <span className="muted">{createOk}</span> : null}
							</div>
							{createErr ? <div className="error" style={{ marginTop: 10 }}>{createErr}</div> : null}
							{createdPassword ? (
								<div className="card pad" style={{ marginTop: 10 }}>
									<div className="muted">Clave generada (compártela de forma segura):</div>
									<pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>{createdPassword}</pre>
								</div>
							) : null}
						</form>
					</div>
				) : null}

				{tab === "usuarios" ? (
					<>
						<div className="card" style={{ marginTop: 12 }}>
							<div className="row" style={{ gap: 12, alignItems: "center" }}>
								<input
									className="input"
									placeholder="Buscar activos por usuario, correo, teléfono, nombre..."
									value={filter}
									onChange={(e) => setFilter(e.target.value)}
								/>
								{usersLoading ? (
									<span className="muted">Cargando...</span>
								) : (
									<span className="muted">{filtered.length} activos (página)</span>
								)}
							</div>
							<div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
								<span className="muted">Ordenar por</span>
								<select className="input" value={activeSortKey} onChange={(e) => setActiveSortKey(e.target.value)} style={{ width: 220 }}>
									<option value="id">ID</option>
									<option value="username">Usuario</option>
									<option value="nombre">Nombre</option>
									<option value="apellido">Apellido</option>
									<option value="nivel">Rol</option>
								</select>
								<button className="btn" onClick={() => setActiveSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
									{activeSortDir === "asc" ? "Asc" : "Desc"}
								</button>
								<span className="muted">A–Z / 0–9 (orden natural)</span>
							</div>
							{usersError ? (
								<div className="error" style={{ marginTop: 10 }}>
									{usersError}
								</div>
							) : null}
						</div>

						<div className="card adminTable" style={{ marginTop: 12, overflowX: "auto" }}>
							<table className="table" style={{ minWidth: 1200 }}>
								<thead>
									<tr>
									<th>ID</th>
										<th>Usuario</th>
										<th>Nombre</th>
										<th>Apellido</th>
										<th>Edad</th>
										<th>Nacimiento</th>
										<th>Correo</th>
										<th>Teléfono</th>
										<th>Estado</th>
										<th>Rol</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{activeSorted.map((u) => (
										<tr key={u.id}>
										<td>{u.id}</td>
											<td>{renderUsernameWithSelfMark(u)}</td>
											<td>{u.nombre || "—"}</td>
											<td>{u.apellido || "—"}</td>
											<td>{u.edad ?? "—"}</td>
											<td>{u.fecha_nacimiento ?? "—"}</td>
											<td>{u.email || "—"}</td>
											<td>{u.telefono || "—"}</td>
											<td>
												<select
													className="input"
													value={u.estado || "pendiente"}
													onChange={(e) => setUserFlags(u, { estado: e.target.value })}
												>
													<option value="pendiente">pendiente</option>
													<option value="activo">activo</option>
													<option value="rechazado">rechazado</option>
													<option value="baneado">baneado</option>
												</select>
											</td>
											<td>
												<select
													className="input"
													value={Number(u.nivel) === 0 ? "admin" : "usuario"}
													onChange={(e) =>
														setUserFlags(u, { nivel: e.target.value === "admin" ? 0 : 1 })
													}
												>
													<option value="usuario">usuario</option>
													<option value="admin">admin</option>
												</select>
											</td>
											<td>
												<div className="row" style={{ flexWrap: "nowrap" }}>
													<button className="btn" onClick={() => showTempPassword(u)}>
														Cambiar clave (automático)
													</button>
													<button className="btn btn-danger" onClick={() => removeUser(u)}>
														Eliminar
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="row" style={{ marginTop: 12, justifyContent: "space-between", alignItems: "center" }}>
							<span className="muted">
								Página {pageInfo.page || 1} / {pageInfo.pages || 1}
							</span>
							<div className="row" style={{ gap: 8 }}>
								<button
									className="btn"
									disabled={(pageInfo.page || 1) <= 1 || usersLoading}
									onClick={() => refreshUsers({ q: filter, page: Math.max(1, (pageInfo.page || 1) - 1) })}
								>
									Anterior
								</button>
								<button
									className="btn"
									disabled={(pageInfo.page || 1) >= (pageInfo.pages || 1) || usersLoading}
									onClick={() => refreshUsers({ q: filter, page: (pageInfo.page || 1) + 1 })}
								>
									Siguiente
								</button>
							</div>
						</div>
					</>
				) : null}

				{tab === "pendientes" ? (
					<>
						<div className="card" style={{ marginTop: 12 }}>
							<div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
								<div>
									<div className="h2">Solicitudes pendientes</div>
									<div className="muted" style={{ marginTop: 6 }}>
										Página {pendingPage.page || 1} / {pendingPage.pages || 1}
									</div>
								</div>
								{pendingLoading ? <span className="muted">Cargando...</span> : null}
							</div>
							<div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
								<span className="muted">Ordenar por</span>
								<select className="input" value={pendingSortKey} onChange={(e) => setPendingSortKey(e.target.value)} style={{ width: 220 }}>
									<option value="id">ID</option>
									<option value="username">Usuario</option>
									<option value="nombre">Nombre</option>
									<option value="apellido">Apellido</option>
								</select>
								<button className="btn" onClick={() => setPendingSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
									{pendingSortDir === "asc" ? "Asc" : "Desc"}
								</button>
								<span className="muted">A–Z / 0–9 (orden natural)</span>
							</div>
							{pendingError ? <div className="error" style={{ marginTop: 10 }}>{pendingError}</div> : null}
						</div>

						<div className="card adminTable" style={{ marginTop: 12, overflowX: "auto" }}>
							<table className="table" style={{ minWidth: 1200 }}>
								<thead>
									<tr>
										<th>ID</th>
										<th>Usuario</th>
										<th>Nombre</th>
										<th>Apellido</th>
										<th>Correo</th>
										<th>IP (signup)</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{pendingSorted.map((u) => (
										<tr key={u.id}>
											<td>{u.id}</td>
												<td>{renderUsernameWithSelfMark(u)}</td>
											<td>{u.nombre || "—"}</td>
											<td>{u.apellido || "—"}</td>
											<td>{u.email || "—"}</td>
											<td>{u.signup_ip || "—"}</td>
											<td>
												<div className="row" style={{ flexWrap: "nowrap" }}>
													<button className="btn" onClick={() => aprobarSolicitud(u)} disabled={pendingLoading}>
														Aprobar
													</button>
													<button className="btn btn-danger" onClick={() => rechazarSolicitud(u)} disabled={pendingLoading}>
														Rechazar
													</button>
													<button className="btn" onClick={() => banIp(u.signup_ip)} disabled={!u.signup_ip}>
														Ban IP
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="row" style={{ marginTop: 12, justifyContent: "space-between", alignItems: "center" }}>
							<span className="muted">
								Página {pendingPage.page || 1} / {pendingPage.pages || 1}
							</span>
							<div className="row" style={{ gap: 8 }}>
								<button
									className="btn"
									disabled={(pendingPage.page || 1) <= 1 || pendingLoading}
									onClick={() => refreshPendientes({ page: Math.max(1, (pendingPage.page || 1) - 1) })}
								>
									Anterior
								</button>
								<button
									className="btn"
									disabled={(pendingPage.page || 1) >= (pendingPage.pages || 1) || pendingLoading}
									onClick={() => refreshPendientes({ page: (pendingPage.page || 1) + 1 })}
								>
									Siguiente
								</button>
							</div>
						</div>
					</>
				) : null}

				{tab === "rechazados" ? (
					<>
						<div className="card" style={{ marginTop: 12 }}>
							<div className="row" style={{ gap: 12, alignItems: "center" }}>
								<input
									className="input"
									placeholder="Buscar en rechazados..."
									value={rejectedFilter}
									onChange={(e) => setRejectedFilter(e.target.value)}
								/>
								{rejectedLoading ? <span className="muted">Cargando...</span> : null}
							</div>
							<div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
								<span className="muted">Ordenar por</span>
								<select className="input" value={rejectedSortKey} onChange={(e) => setRejectedSortKey(e.target.value)} style={{ width: 220 }}>
									<option value="id">ID</option>
									<option value="username">Usuario</option>
									<option value="nombre">Nombre</option>
									<option value="apellido">Apellido</option>
								</select>
								<button className="btn" onClick={() => setRejectedSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
									{rejectedSortDir === "asc" ? "Asc" : "Desc"}
								</button>
								<span className="muted">A–Z / 0–9 (orden natural)</span>
							</div>
							<div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
								<button className="btn" onClick={() => refreshRechazados({ q: rejectedFilter, page: 1 })} disabled={rejectedLoading}>
									Buscar
								</button>
								<span className="muted">Página {rejectedPage.page || 1} / {rejectedPage.pages || 1}</span>
							</div>
							{rejectedError ? <div className="error" style={{ marginTop: 10 }}>{rejectedError}</div> : null}
						</div>

						<div className="card adminTable" style={{ marginTop: 12, overflowX: "auto" }}>
							<table className="table" style={{ minWidth: 1300 }}>
								<thead>
									<tr>
										<th>ID</th>
										<th>Usuario</th>
										<th>Nombre</th>
										<th>Apellido</th>
										<th>Correo</th>
										<th>IP (signup)</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{rejectedSorted.map((u) => (
										<tr key={u.id}>
											<td>{u.id}</td>
												<td>{renderUsernameWithSelfMark(u)}</td>
											<td>{u.nombre || "—"}</td>
											<td>{u.apellido || "—"}</td>
											<td>{u.email || "—"}</td>
											<td>{u.signup_ip || "—"}</td>
											<td>
												<div className="row" style={{ flexWrap: "nowrap" }}>
													<button className="btn" onClick={() => banIp(u.signup_ip)} disabled={!u.signup_ip}>
														Ban IP
													</button>
													<button className="btn btn-danger" onClick={() => removeUser(u)}>
														Eliminar
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="row" style={{ marginTop: 12, justifyContent: "space-between", alignItems: "center" }}>
							<span className="muted">
								Página {rejectedPage.page || 1} / {rejectedPage.pages || 1}
							</span>
							<div className="row" style={{ gap: 8 }}>
								<button
									className="btn"
									disabled={(rejectedPage.page || 1) <= 1 || rejectedLoading}
									onClick={() => refreshRechazados({ q: rejectedFilter, page: Math.max(1, (rejectedPage.page || 1) - 1) })}
								>
									Anterior
								</button>
								<button
									className="btn"
									disabled={(rejectedPage.page || 1) >= (rejectedPage.pages || 1) || rejectedLoading}
									onClick={() => refreshRechazados({ q: rejectedFilter, page: (rejectedPage.page || 1) + 1 })}
								>
									Siguiente
								</button>
							</div>
						</div>
					</>
				) : null}

				{tab === "auditoria" ? (
					<>
						<div className="card" style={{ marginTop: 12 }}>
							<div className="h2">Auditoría</div>
							<div className="muted" style={{ marginTop: 6 }}>
								Aquí se registra “quién hizo qué y cuándo”. Sirve para control, seguridad y para investigar cambios.
							</div>
							<details style={{ marginTop: 10 }}>
								<summary className="btn" style={{ display: "inline-block" }}>
									Ayuda: cómo leer auditoría
								</summary>
								<div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
									<b>ID</b>: número interno del evento de auditoría (solo identifica la fila del log).
									<br />
									<b>Fecha</b>: fecha/hora exacta del evento (ISO). Útil para saber el orden real.
									<br />
									<b>Actor</b>: el usuario que ejecutó la acción. Si dice <i>system</i>, fue una regla automática.
									<br />
									<b>ID Actor</b>: el ID del usuario que hizo la acción (si aplica). Si es <i>system</i> o no se pudo resolver, queda en “—”.
									<br />
									<br />
									<b>Ejemplos rápidos:</b>
									<br />
									- Actor=<b>juan</b> (ID Actor=<b>12</b>) · Acción=<b>UPDATE</b> · Entidad=<b>material</b> · ID Entidad=<b>5</b> → Juan (12) editó el material (5).
									<br />
									- Actor=<b>system</b> · Acción=<b>SECURITY</b> · Entidad=<b>login_banned</b> · ID Actor=— · ID Entidad=— → el sistema aplicó una regla automática.
									<br />
									<b>Acción</b>: tipo de operación:
									<br />
									- <b>CREATE</b>: se creó algo
									<br />
									- <b>UPDATE</b>: se editó algo
									<br />
									- <b>DELETE</b>: se eliminó algo
									<br />
									- <b>BAN/UNBAN</b>: bloqueo/desbloqueo (por ejemplo IP)
									<br />
									- <b>SECURITY</b>: evento de seguridad (cooldown, ban automático, etc.)
									<br />
									<b>Entidad</b>: qué “tipo de cosa” se afectó.
									<br />
									Ejemplos comunes:
									<br />
									- <b>usuario</b>: una cuenta (creación, edición, eliminación)
									<br />
									- <b>solicitud_usuario</b>: flujo de pendientes (aprobar/rechazar)
									<br />
									- <b>me</b>, <b>me_password</b>, <b>me_security</b>: cambios hechos por el propio usuario en “Mi cuenta”
									<br />
									- <b>material</b>: inventario (crear/editar/eliminar)
									<br />
									- <b>ip</b>: registro interno de IP (ban/unban)
									<br />
									<b>ID Entidad</b>: el ID del registro afectado en la base de datos.
									<br />
									Cómo interpretarlo según la entidad:
									<br />
									- Si <b>Entidad</b> es <b>usuario</b> o <b>me*</b> → <b>ID Entidad</b> es el ID del usuario (lo ves en la tabla “Activos/Pendientes/Rechazados”).
									<br />
									- Si <b>Entidad</b> es <b>material</b> → <b>ID Entidad</b> es el ID del material del inventario.
									<br />
									- Si <b>Entidad</b> es <b>ip</b> → <b>ID Entidad</b> es el ID del registro interno de IP (no el texto de la IP).
								</div>
							</details>
							<div className="muted" style={{ marginTop: 8 }}>
								Página {auditPage.page || 1} / {auditPage.pages || 1}
							</div>
							{auditError ? <div className="error" style={{ marginTop: 10 }}>{auditError}</div> : null}
						</div>

						<div className="card" style={{ marginTop: 12 }}>
							<div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
								<span className="muted">Ordenar por</span>
								<select className="input" value={auditSortKey} onChange={(e) => setAuditSortKey(e.target.value)} style={{ width: 220 }}>
									<option value="ts">Fecha</option>
									<option value="id">ID</option>
									<option value="actor">Actor</option>
									<option value="actor_id">ID Actor</option>
									<option value="action">Acción</option>
									<option value="entity">Entidad</option>
									<option value="entity_id">ID Entidad</option>
								</select>
								<button className="btn" onClick={() => setAuditSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
									{auditSortDir === "asc" ? "Asc" : "Desc"}
								</button>
								<span className="muted">A–Z / 0–9 (orden natural)</span>
							</div>
						</div>

						<div className="card" style={{ marginTop: 12, overflowX: "auto" }}>
							<table className="table" style={{ minWidth: 1200 }}>
								<thead>
									<tr>
										<th>ID</th>
										<th>Fecha</th>
										<th>Actor</th>
										<th>ID Actor</th>
										<th>Acción</th>
										<th>Entidad</th>
										<th>ID Entidad</th>
									</tr>
								</thead>
								<tbody>
									{auditSorted.map((a) => (
										<tr key={a.id}>
											<td>{a.id}</td>
											<td>{a.ts}</td>
											<td>{a.actor || "—"}</td>
											<td>{a.actor_id ?? "—"}</td>
											<td>{a.action}</td>
											<td>{a.entity}</td>
											<td>{a.entity_id ?? "—"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="row" style={{ marginTop: 12, justifyContent: "space-between", alignItems: "center" }}>
							<span className="muted">
								Página {auditPage.page || 1} / {auditPage.pages || 1}
							</span>
							<div className="row" style={{ gap: 8 }}>
								<button
									className="btn"
									disabled={(auditPage.page || 1) <= 1 || auditLoading}
									onClick={() => refreshAuditoria({ page: Math.max(1, (auditPage.page || 1) - 1) })}
								>
									Anterior
								</button>
								<button
									className="btn"
									disabled={(auditPage.page || 1) >= (auditPage.pages || 1) || auditLoading}
									onClick={() => refreshAuditoria({ page: (auditPage.page || 1) + 1 })}
								>
									Siguiente
								</button>
							</div>
						</div>
					</>
				) : null}

				{tab === "ips" ? (
					<>
						<div className="card" style={{ marginTop: 12 }}>
							<div className="h2">IPs</div>
							<div className="muted" style={{ marginTop: 6 }}>Listado de IPs (ban/unban)</div>
							{ipsError ? <div className="error" style={{ marginTop: 10 }}>{ipsError}</div> : null}
						</div>

						<div className="card" style={{ marginTop: 12, overflowX: "auto" }}>
							<table className="table" style={{ minWidth: 1400 }}>
								<thead>
									<tr>
										<th>IP</th>
										<th>Estado</th>
										<th>Login fails</th>
										<th>Forgot fails</th>
										<th>Geo</th>
										<th>Cuentas</th>
										<th>Último</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{ips.map((r) => {
										const self = getUsuario();
										const accounts = Array.isArray(r.accounts) ? r.accounts : [];
										const hasSelf = self && accounts.some((a) => String(a?.username || "") === String(self));
										const accountsTxt = accounts.length
											? accounts
												.map((a) => {
													const mark = self && String(a?.username || "") === String(self) ? " (tú)" : "";
													return `${a.username} (ID ${a.id})${mark}`;
												})
												.join(", ")
											: "—";
										return (
											<tr key={r.id}>
												<td>{r.ip || "—"}</td>
												<td>{r.estado}</td>
												<td>{r.login_fails ?? "—"}</td>
												<td>{(r.forgot_fail1 ?? 0) + (r.forgot_fail2 ?? 0)}</td>
												<td>{[r.geo_country, r.geo_region].filter(Boolean).join("/") || "—"}</td>
												<td>{accountsTxt}</td>
												<td>{r.last_seen}</td>
												<td>
													<div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
														<button className="btn" onClick={() => banIp(r.ip)} disabled={!r.ip || ipsLoading || hasSelf} title={hasSelf ? "No se permite banear tu propia IP." : ""}>
															Ban
														</button>
														<button className="btn" onClick={() => unbanIp(r.ip)} disabled={!r.ip || ipsLoading}>
															Limpiar
														</button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
