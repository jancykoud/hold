import { describe, expect, it } from 'vitest'
import { cookieNames, cookieOptions } from './cookie-settings'

describe('the session cookies', () => {
  it('carry the __Host- prefix wherever they are Secure, so no other host or plain-HTTP page can set or shadow them', () => {
    for (const environment of ['production', 'test'] as const) {
      const names = Object.values(cookieNames({ environment }))
      expect(names.length).toBeGreaterThanOrEqual(7)
      for (const name of names) expect(name, environment).toMatch(/^__Host-hold_/)
      // What the prefix asks of a cookie, or the browser refuses it.
      expect(cookieOptions({ environment })).toMatchObject({ secure: true, path: '/' })
      expect(cookieOptions({ environment })).not.toHaveProperty('domain')
    }
  })

  // The built app on its fakes, opened by a person at http://localhost: Safari keeps no Secure cookie from plain HTTP,
  // so every click signed them out. Asked for by name, and only where nothing is real.
  it('keep their plain names for the fakes on plain HTTP when asked, and never for a deployment', () => {
    for (const name of Object.values(cookieNames({ environment: 'test', plainCookies: true }))) expect(name).toMatch(/^hold_/)
    expect(cookieOptions({ environment: 'test', plainCookies: true })).toMatchObject({ secure: false, httpOnly: true })
    expect(cookieOptions({ environment: 'test', plainCookies: false })).toMatchObject({ secure: true })
  })

  it('keep their plain names on a developer’s machine, which serves plain HTTP that a browser refuses the prefix over', () => {
    for (const name of Object.values(cookieNames({ environment: 'development' }))) expect(name).toMatch(/^hold_/)
    expect(cookieOptions({ environment: 'development' })).toMatchObject({ secure: false })
  })
})
