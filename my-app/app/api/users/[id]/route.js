// GET/PUT/DELETE API route for a specific user by ID
import { getConnection } from '../../../../lib/db'
import { hashPassword } from '../../../../lib/password'

// ===== GET: Retrieve user by ID =====
export async function GET(request, { params }) {
    try {
        // Validate and parse ID
        const { id } = await params
        const parsedId = Number.parseInt(id, 10)
        if (Number.isNaN(parsedId)) {
            return Response.json({ error: 'Invalid id. Must be an integer.' }, { status: 400 })
        }
        
        // Query user by ID
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', parsedId)
            .query('SELECT id, firstname, lastname, email, password FROM dbo.user_profiles WHERE id = @id')
        
        if (result.recordset.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 })
        }
        
        return Response.json({ value: result.recordset[0] })
    } catch (error) {
        console.error('Database error:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }
}

// ===== PUT: Update user by ID =====
export async function PUT(request, { params }) {
    try {
        // Validate and parse ID
        const { id } = await params
        const parsedId = Number.parseInt(id, 10)
        if (Number.isNaN(parsedId)) {
            return Response.json({ error: 'Invalid id. Must be an integer.' }, { status: 400 })
        }
        
        // Parse update data
        const { firstname, lastname, email, password } = await request.json()
        
        const pool = await getConnection()
        let query = `
            UPDATE dbo.user_profiles
            SET firstname = @firstname, lastname = @lastname, email = @email`
        
        const request_obj = pool.request()
            .input('id', parsedId)
            .input('firstname', firstname)
            .input('lastname', lastname)
            .input('email', email)
        
        // Only update password if provided
        if (password) {
            const hashedPassword = await hashPassword(password)
            request_obj.input('password', hashedPassword)
            query += ', password = @password'
        }
        
        query += `
            OUTPUT INSERTED.*
            WHERE id = @id`
        
        const result = await request_obj.query(query)
        
        if (result.recordset.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 })
        }
        
        return Response.json({ value: result.recordset[0] })
    } catch (error) {
        console.error('Database error:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }
}

// ===== DELETE: Remove user by ID =====
export async function DELETE(request, { params }) {
    try {
        // Validate and parse ID
        const { id } = await params
        const parsedId = Number.parseInt(id, 10)
        if (Number.isNaN(parsedId)) {
            return Response.json({ error: 'Invalid id. Must be an integer.' }, { status: 400 })
        }
        
        // Delete user from database
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', parsedId)
            .query('DELETE FROM dbo.user_profiles WHERE id = @id')
        
        if (result.rowsAffected[0] === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 })
        }
        
        return Response.json({ success: true })
    } catch (error) {
        console.error('Database error:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }
}
