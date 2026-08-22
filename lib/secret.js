import crypto from 'node:crypto'

function key() {
  const value = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters')
  }
  return Buffer.from(value, 'hex')
}

export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
  }
}

export function decryptSecret(value) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(value.tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
