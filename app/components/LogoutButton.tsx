'use client'

export function LogoutButton() {
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.assign('/login')
  }

  return (
    <button className="button" type="button" onClick={logout}>
      Logout
    </button>
  )
}
