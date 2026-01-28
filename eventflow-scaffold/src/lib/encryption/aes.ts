/**
 * AES-GCM Encryption Utility for EventFlow
 * Use this to encrypt API credentials before storing in database
 * Format: iv:ciphertext (both base64 encoded)
 */

export async function encryptCredentials(
  data: Record<string, string>,
  key: string
): Promise<string> {
  const encoder = new TextEncoder()

  // Ensure 256-bit key
  const keyBytes = encoder.encode(key.padEnd(32, '0').slice(0, 32))

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-GCM',
    false,
    ['encrypt']
  )

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(JSON.stringify(data))
  )

  // Convert to base64
  const ivBase64 = btoa(String.fromCharCode(...iv))
  const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))

  return `${ivBase64}:${ciphertextBase64}`
}

export async function decryptCredentials<T = Record<string, string>>(
  encryptedData: string,
  key: string
): Promise<T> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  // Ensure 256-bit key
  const keyBytes = encoder.encode(key.padEnd(32, '0').slice(0, 32))

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-GCM',
    false,
    ['decrypt']
  )

  // Parse encrypted data
  const [ivBase64, ciphertextBase64] = encryptedData.split(':')
  if (!ivBase64 || !ciphertextBase64) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0))

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  )

  return JSON.parse(decoder.decode(decrypted))
}
