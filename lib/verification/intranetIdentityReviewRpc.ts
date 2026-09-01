export function mapIdentityReviewRpcError(message: string): { status: number; error: string } | null {
  if (message === "Acceso no autorizado") return { status: 403, error: "Acceso no autorizado." };
  if (message === "Esta identidad ya fue aprobada, rechazada o no está pendiente de revisión") {
    return { status: 409, error: "Esta identidad ya fue aprobada, rechazada o no está pendiente de revisión." };
  }
  if (message === "No se puede rechazar la verificación del super administrador") {
    return { status: 403, error: "No se puede rechazar la verificación del super administrador." };
  }
  return null;
}
