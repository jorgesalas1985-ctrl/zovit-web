type RpcErrorResponse = { status: number; error: string };

/** Conserva el contrato HTTP de manual-override al traducir errores controlados del RPC. */
export function mapManualOverrideRpcError(message: string): RpcErrorResponse | null {
  if (message === "Acceso no autorizado") {
    return { status: 403, error: "Solo el superadministrador puede aprobar sin verificación." };
  }
  if (message === "No se encontró la cuenta") {
    return { status: 404, error: "No se encontró la cuenta." };
  }
  if (message === "La cuenta protegida del superadministrador no usa esta excepción") {
    return { status: 400, error: "La cuenta protegida del superadministrador no usa esta excepción." };
  }
  if (message === "Confirmación de seguridad incorrecta") {
    return { status: 400, error: "Confirmación de seguridad incorrecta." };
  }
  if (message === "La identidad debe estar pendiente para usar esta excepción") {
    return { status: 409, error: "La identidad debe estar pendiente para usar esta excepción." };
  }
  return null;
}
