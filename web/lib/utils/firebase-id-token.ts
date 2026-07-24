import { createRemoteJWKSet, errors, jwtVerify } from 'jose'

const JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
)

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

export type FirebaseIdTokenClaims = {
  uid: string
  email?: string
  name?: string
  picture?: string
}

export class IdTokenExpiredError extends Error {}

// Verifies a Firebase Authentication ID token per
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
export const verifyFirebaseIdToken = async (
  idToken: string,
): Promise<FirebaseIdTokenClaims> => {
  const projectId = process.env.FIREBASE_PROJECT_ID
  jwks ??= createRemoteJWKSet(JWKS_URL)

  let payload
  try {
    ;({ payload } = await jwtVerify(idToken, jwks, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    }))
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new IdTokenExpiredError('id token expired')
    }
    throw error
  }
  if (!payload.sub) {
    throw new Error('id token missing sub claim')
  }
  return {
    uid: payload.sub,
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
  }
}
