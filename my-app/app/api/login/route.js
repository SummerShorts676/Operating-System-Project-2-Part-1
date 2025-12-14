import { getConnection } from '../../../lib/db'
import { comparePassword } from '../../../lib/password'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const pool = await getConnection()
    const result = await pool.request()
      .input('email', email)
      .query('SELECT id, firstname, lastname, email, password FROM dbo.user_profiles WHERE email = @email')

    if (result.recordset.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = result.recordset[0]
    const ok = await comparePassword(password, user.password)
    if (!ok) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Minimal session stub (for demo). In real app, issue JWT/cookie.
    const { password: _, ...safeUser } = user
    return Response.json({ user: safeUser })
  } catch (error) {
    console.error('Login error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
