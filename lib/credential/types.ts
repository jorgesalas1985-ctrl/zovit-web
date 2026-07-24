export type PublicCredentialProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  rut: string | null;
  role: string;
  avatar_url: string | null;
  identity_verified: boolean;
  biometric_verified: boolean;
  study_verified: boolean;
  identity_status: string;
  experience_level: string | null;
};