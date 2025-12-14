// Database connection helper for MSSQL Azure database
import sql from 'mssql'

const config = {
    server: 'cpsy300project.database.windows.net',
    database: 'Users',
    user: 'test-admin',
    password: '$ex12345',
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
}

let pool

export async function getConnection() {
    if (!pool) {
        pool = await sql.connect(config)
    }
    return pool
}

export { sql }
