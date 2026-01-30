/**
 * Standard interface for the Access Token payload (JWT).
 */
export interface JwtPayload {
  sub: number; // Subject: User ID (used in many JWT standards)
  email: string; // User email
}
