type RpcErrorResponse = { status: number; error: string };
type ResubmissionFlow = "multiple" | "single";

const ACCESS_DENIED = "Acceso no autorizado";
const PENDING_CONFLICT = "La identidad ya no está pendiente de revisión";
const FOREIGN_DOCUMENT = "Uno o más documentos no pertenecen a esta identidad";
const INVALID_DOCUMENTS = "Los documentos solicitados no son válidos";
const PROFILE_NOT_FOUND = "Perfil no encontrado";

/** Conserva el contrato HTTP de la ruta al traducir errores controlados del RPC. */
export function mapIdentityResubmissionRpcError(
  message: string,
  flow: ResubmissionFlow = "multiple",
): RpcErrorResponse | null {
  if (message === ACCESS_DENIED) {
    return { status: 403, error: "Acceso no autorizado." };
  }

  if (message === PENDING_CONFLICT) {
    return { status: 409, error: "La identidad ya no está pendiente de revisión." };
  }

  if ([FOREIGN_DOCUMENT, INVALID_DOCUMENTS, PROFILE_NOT_FOUND].includes(message)) {
    if (flow === "single") {
      return { status: 404, error: "Documento no encontrado." };
    }
    return { status: 400, error: "Uno o más documentos no pertenecen a esta identidad." };
  }

  return null;
}
