import bcrypt from 'bcrypt'

// Hash the password using bcrypt
export async function hashPassword(password) {
    return await bcrypt.hash(password, 10)
}

// Compare a password with its hash
export async function comparePassword(password, storedHash) {
    return await bcrypt.compare(password, storedHash)
}
