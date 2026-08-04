import { Lock, ShieldCheck } from "lucide-react";

export function ChatSafetyDialogue() {
  return (
    <div className="chatSafetyDialogue">
      <p className="chatSafetyDialogueLead">
        Para cuidar tu <em>seguridad</em> y que todo sea <em>transparente</em>, te pedimos que
        coordines el servicio solo dentro de ZOVIT. No compartas teléfono, WhatsApp ni correo
        electrónico hasta que el cliente realice el pago en la app.
      </p>

      <div className="chatSafetyDialogueRow">
        <span className="chatSafetyDialogueIcon" aria-hidden>
          <ShieldCheck size={18} />
        </span>
        <p>
          El monto real del trabajo debe registrarse y pagarse en ZOVIT. Esto nos permite{" "}
          <em>proteger tu trabajo, asegurar tu pago</em> y mantener una experiencia justa para
          todos.
        </p>
      </div>

      <div className="chatSafetyDialogueWarn">
        <span className="chatSafetyDialogueIcon" aria-hidden>
          <Lock size={18} />
        </span>
        <p>
          Declarar un monto menor para reducir la comisión o solicitar pagos fuera de la app puede
          generar bloqueos y afectar tu cuenta. Contamos contigo para mantener una{" "}
          <em>comunidad segura y confiable</em>.
        </p>
      </div>
    </div>
  );
}
