/**
 * Guías de formato para inputs vacíos en todo ZOVIT.
 * Usar en placeholder y, cuando ayude, en fieldHint debajo del campo.
 */
export const FIELD_PLACEHOLDERS = {
  firstName: "Ej: Jorge Andrés",
  lastName: "Ej: Salas Guzmán",
  rut: "16.032.189-K",
  rutHint: "Formatos válidos: 16032189k · 16.032.189-k · 16032189-k",
  phone: "+56 9 1234 5678",
  email: "nombre@correo.com",
  password: "Mínimo 8 caracteres",
  address: "Calle, número, depto/casa",
  commune: "Ej: Santiago, Maipú, Providencia",
  birthDate: "dd-mm-aaaa",
  category: "Ej: Hogar, Construcción",
  description: "Describe el trabajo con el mayor detalle posible",
  serviceAddress: "Dirección o comuna del servicio",
  credentialId: "https://zovit.cl/credencial/… o ID",
  profession: "Ej: Electricista, Pintor, Técnico",
  institution: "Ej: INACAP, Duoc UC, Liceo Industrial",
  credentialName: "Ej: Título técnico / Licencia SEC",
  yearObtained: "Ej: 2018",
  registryNumber: "Ej: SEC-12345 (si aplica)",
  yearsExperience: "Ej: 5",
  experienceDescription: "Resume trabajos realizados y especialidades",
  tools: "Ej: Andamio, taladro, herramienta menor",
  serviceZones: "Ej: Santiago, Maipú, Ñuñoa",
  career: "Ej: Electricidad industrial",
  semester: "Ej: 3er semestre / 2º año",
  availability: "Ej: Tardes y fines de semana",
  transport: "Ej: Auto, moto, transporte público",
  emergencyContact: "Nombre y teléfono de emergencia",
  hoursFrom: "09:00",
  hoursTo: "18:00",
  radiusKm: "Ej: 15",
  referenceRate: "Ej: desde $15.000 / hora",
  searchQuery: "Ej: Necesito un gasfiter en Ñuñoa",
} as const;

export const RUT_FORMAT_ERROR =
  "Ingresa un RUT válido. Formatos: 16032189k · 16.032.189-k · 16032189-k";
