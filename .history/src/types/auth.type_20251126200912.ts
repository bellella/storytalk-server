/**
 * Standard interface for the Access Token payload (JWT).
 */
export interface JwtPayload {
  sub: number;       // Subject: User ID (used in many JWT standards)
  email: string;     // User email
  // You can add other essential, non-sensitive data here (e.g., roles)
  // role: string; 
}

/**
 * Interface for the validated payload after checking a Refresh Token.
 */
export interface JwtPayloadWithRefreshToken extends JwtPayload {
  refreshToken: string; // The raw refresh token string extracted from the header
}