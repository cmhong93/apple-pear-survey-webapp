import { ADMIN_ROLE, MVP_SURVEYORS } from '@/data/constants'

export type AppRole = typeof ADMIN_ROLE | (typeof MVP_SURVEYORS)[number]['id']

export interface LoginResult {
  ok: boolean
  role?: AppRole
  message: string
}

export function authenticateMvpLogin(identifier: string, secret: string): LoginResult {
  const normalized = identifier.trim().toUpperCase()
  const surveyor = MVP_SURVEYORS.find((item) => item.id === normalized)

  if (surveyor && secret.length > 0) {
    return { ok: true, role: surveyor.id, message: 'Surveyor login accepted by MVP stub.' }
  }

  if (normalized === ADMIN_ROLE.toUpperCase() && secret.length > 0) {
    return { ok: true, role: ADMIN_ROLE, message: 'Admin login accepted by MVP stub.' }
  }

  return { ok: false, message: 'Unknown MVP login.' }
}
