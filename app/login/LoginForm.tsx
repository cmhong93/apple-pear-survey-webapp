'use client'

import { useState } from 'react'

export function LoginForm() {
  const [identifier, setIdentifier] = useState('S01')
  const [secret, setSecret] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, secret }),
    })

    const result = (await response.json()) as {
      ok: boolean
      message: string
      redirectTo?: string
    }

    setIsLoading(false)
    if (!response.ok || !result.ok) {
      setMessage(result.message || '로그인에 실패했습니다.')
      return
    }

    window.location.assign(result.redirectTo ?? '/survey')
  }

  return (
    <form className="form-grid" onSubmit={submitLogin}>
      <label className="field">
        조사원 ID
        <input
          name="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="S01 또는 admin"
          autoComplete="username"
        />
      </label>
      <label className="field">
        비밀번호
        <input
          name="secret"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          type="password"
          placeholder="비밀번호 입력"
          autoComplete="current-password"
        />
      </label>
      <button className="button" type="submit" disabled={isLoading}>
        {isLoading ? '확인 중...' : '로그인'}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  )
}
