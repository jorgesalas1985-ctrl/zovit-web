"use client";

import { Bot, BrainCircuit, KeyRound, LockKeyhole, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ZovitAiChat } from "@/components/intranet/ZovitAiChat";

type Training = { version: string; level?: "foundation" | "advanced"; status: string; title: string; completedAt: string; knowledgeUnits: number; evaluationsPassed: number; evaluationsTotal: number; score: number; nextAutomaticReviewAt: string; sources: string[]; capabilities: string[]; safeguards: string[]; domains?: string[]; scenarios?: number; criticalRulesPassed?: boolean; platformKnowledge?: { checksum: string; learnedAt: string; totalChanges: number; areas: Array<{ name: string; count: number }> } };
type VaultState = { configured: boolean; unlocked: boolean; training?: Training | null };

export function ZovitAiVault() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [resetting, setResetting] = useState(false);
  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/intranet/ai-vault", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No fue posible validar el acceso.");
      setVault(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible validar el acceso.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const handleExpired = () => void load();
    window.addEventListener("zovit-ai-session-expired", handleExpired);
    return () => window.removeEventListener("zovit-ai-session-expired", handleExpired);
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const action = !vault?.configured ? "setup" : resetting ? "reset" : "unlock";
    try {
      const response = await fetch("/api/intranet/ai-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, secret, confirmSecret, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No fue posible completar el acceso.");
      setSecret(""); setConfirmSecret(""); setPassword(""); setResetting(false);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible completar el acceso.");
    } finally { setBusy(false); }
  }

  async function lock() {
    await fetch("/api/intranet/ai-vault", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout", secret: "000000" }) });
    await load();
  }

  async function trainAgain() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/intranet/ai-vault", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "train", secret: "000000" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No fue posible actualizar el entrenamiento.");
      await load();
    } catch (trainingError) { setError(trainingError instanceof Error ? trainingError.message : "No fue posible actualizar el entrenamiento."); }
    finally { setBusy(false); }
  }

  if (!vault) return <div className="centerState">Verificando seguridad…</div>;

  if (vault.unlocked) {
    return (
      <div className="aiVaultDashboard">
        <div className="aiVaultHero">
          <div className="aiVaultOrb"><BrainCircuit size={48} /></div>
          <div><span className="aiVaultStatus"><ShieldCheck size={16} /> Sesión privada activa</span><h2>Centro de inteligencia ZOVIT</h2><p>Entrena, supervisa y define las reglas de la IA que trabajará dentro de ZOVIT.</p></div>
          <button type="button" className="secondaryButton" onClick={() => void lock()}><LogOut size={17} /> Cerrar acceso privado</button>
        </div>
        <ZovitAiChat />
        {vault.training && (
          <section className="aiTrainingPanel">
            <div className="aiTrainingTop">
              <div><span className="aiVaultStatus"><ShieldCheck size={16} /> {vault.training.level === "advanced" ? "Entrenamiento avanzado completado" : "Primer entrenamiento completado"}</span><h3>{vault.training.title}</h3><p>Versión {vault.training.version} · {vault.training.knowledgeUnits} unidades aprobadas · evaluación {vault.training.score}%</p></div>
              <button type="button" className="secondaryButton" disabled={busy} onClick={() => void trainAgain()}><RefreshCw size={17} /> {busy ? "Actualizando…" : "Actualizar ahora"}</button>
            </div>
            <div className="aiTrainingProgress"><span style={{ width: `${vault.training.score}%` }} /></div>
            <div className="aiTrainingStats"><div><strong>{vault.training.knowledgeUnits}</strong><small>Conocimientos</small></div><div><strong>{vault.training.evaluationsPassed}/{vault.training.evaluationsTotal}</strong><small>Casos aprobados</small></div><div><strong>{vault.training.domains?.length ?? 2}</strong><small>Dominios entrenados</small></div></div>
            {vault.training.domains && <div className="aiTrainingDomains">{vault.training.domains.map((domain) => <span key={domain}>{domain}</span>)}</div>}
            {vault.training.platformKnowledge && <div className="aiChangeMemory"><div><strong>{vault.training.platformKnowledge.totalChanges}</strong><span>Cambios de la plataforma aprendidos</span></div><div><strong>{vault.training.platformKnowledge.areas.length}</strong><span>Áreas actualizadas</span></div><small>Memoria sincronizada automáticamente al compilar · {vault.training.platformKnowledge.checksum}</small></div>}
            <details><summary>Ver lo aprendido y sus límites</summary><div className="aiTrainingDetails"><div><h4>Ahora puede</h4>{vault.training.capabilities.map((item) => <p key={item}>✓ {item}</p>)}</div><div><h4>Protecciones activas</h4>{vault.training.safeguards.map((item) => <p key={item}>🔒 {item}</p>)}</div></div></details>
          </section>
        )}
        <div className="intranetGrid aiVaultGrid">
          <article className="intranetCard intranetCardStatic"><Bot size={24} /><h3>Entrenamiento avanzado</h3><p>{vault.training?.knowledgeUnits ?? 0} conocimientos y {vault.training?.scenarios ?? 0} casos operativos aprobados.</p><span className="aiVaultReady">Activo · {vault.training?.version}</span></article>
          <article className="intranetCard intranetCardStatic"><ShieldCheck size={24} /><h3>Reglas y límites</h3><p>Define qué puede hacer, qué necesita aprobación y qué acciones están prohibidas.</p><span className="aiVaultSoon">Próxima etapa</span></article>
          <article className="intranetCard intranetCardStatic"><BrainCircuit size={24} /><h3>Pruebas</h3><p>Evalúa respuestas antes de habilitarlas para clientes, profesionales y administración.</p><span className="aiVaultSoon">Próxima etapa</span></article>
        </div>
      </div>
    );
  }

  const setup = !vault.configured;
  return (
    <section className="aiVaultGate">
      <div className="aiVaultLock"><LockKeyhole size={34} /></div>
      <p className="kicker">SEGURIDAD REFORZADA</p>
      <h2>{setup ? "Crea tu código privado" : resetting ? "Restablecer código" : "Acceso a ZOVIT IA"}</h2>
      <p className="muted">{setup ? "Configura un código de 6 números exclusivo para este módulo." : resetting ? "Confirma tu contraseña de superadministrador y crea un código nuevo." : "Ingresa el código secreto. La sesión privada dura 15 minutos."}</p>
      <form className="formStack aiVaultForm" onSubmit={submit}>
        <label>Código secreto<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={secret} onChange={(event) => setSecret(event.target.value.replace(/\D/g, ""))} placeholder="••••••" autoComplete="one-time-code" /></label>
        {(setup || resetting) && <label>Repetir código<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={confirmSecret} onChange={(event) => setConfirmSecret(event.target.value.replace(/\D/g, ""))} placeholder="••••••" /></label>}
        {resetting && <label>Contraseña de superadministrador<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña actual" autoComplete="current-password" /></label>}
        {error && <div className="formMessage">{error}</div>}
        <button className="primaryButton wide" disabled={busy}><KeyRound size={18} /> {busy ? "Verificando…" : setup ? "Crear código y entrar" : resetting ? "Guardar código nuevo" : "Ingresar"}</button>
      </form>
      {!setup && <button type="button" className="aiVaultReset" onClick={() => { setResetting((value) => !value); setError(""); }}><RefreshCw size={16} /> {resetting ? "Volver al ingreso" : "Olvidé mi código"}</button>}
    </section>
  );
}
