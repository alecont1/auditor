import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_ISSUER = 'auditeng-api';
const JWT_AUDIENCE = 'auditeng-web';

// Token expiration: 7 days (as per spec)
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST';
  companyId: string | null;
}

// Create a secret key from the JWT_SECRET string
const getSecretKey = () => {
  const encoder = new TextEncoder();
  return encoder.encode(JWT_SECRET);
};

export async function createToken(payload: TokenPayload): Promise<string> {
  const jwt = await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecretKey());

  return jwt;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST',
      companyId: payload.companyId as string | null,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
