// GET/POST API route for users - retrieves all users or creates a new user
import { getConnection } from '../../../lib/db'
import { hashPassword } from '../../../lib/password'

// ===== GET: Retrieve all users =====
export async function GET() {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query('SELECT id, firstname, lastname, email, password FROM dbo.user_profiles')
        
        return Response.json({ value: result.recordset })
    } catch (error) {
        console.error('Database error:', error)
        return Response.json({ 
            error: error.message,
            details: error.toString(),
            code: error.code 
        }, { status: 500 })
    }
}

// ===== POST: Create new user =====
export async function POST(request) {
    try {
        // Validate input
        const { firstname, lastname, email, password } = await request.json()
        
        if (!firstname || !lastname || !email || !password) {
            return Response.json({ 
                error: 'Missing required fields' 
            }, { status: 400 })
        }
        
        console.log('Creating user:', { firstname, lastname, email })
        
        // Hash the password
        const hashedPassword = await hashPassword(password)
        
        // Insert user into database
        const pool = await getConnection()
        const result = await pool.request()
            .input('firstname', firstname)
            .input('lastname', lastname)
            .input('email', email)
            .input('password', hashedPassword)
            .query(`
                INSERT INTO dbo.user_profiles (firstname, lastname, email, password)
                OUTPUT INSERTED.*
                VALUES (@firstname, @lastname, @email, @password)
            `)
        
        return Response.json({ value: result.recordset[0] })
    } catch (error) {
        console.error('Database error:', error)
        return Response.json({ 
            error: error.message,
            details: error.toString(),
            code: error.code 
        }, { status: 500 })
    }
}
