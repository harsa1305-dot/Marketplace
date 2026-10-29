// src/lib/validation/auth.ts — Validasi Ketat Registrasi Pengguna
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'trashmail.net',
  'getairmail.com',
  'sharklasers.com',
  'dispostable.com',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'burnermail.io',
  'generator.email',
  'inboxkitten.com',
  'crazymailing.com',
  'maildrop.cc',
  'tempail.com',
  'mohmal.com',
  'mytemp.email',
  'nada.ltd',
  'getnada.com',
  'dropmail.me',
  'emailondeck.com',
  'tempmailaddress.com',
  'mailnesia.com',
  'boun.cr',
  'mytrashmail.com',
  'mailcatch.com',
  'mytempemail.com',
  'trashymail.com',
  'zillamail.com',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'tinytuba.com',
  'vmani.com',
])

/**
 * Validasi ketat nomor telepon Indonesia:
 * - Wajib hanya berisi angka (opsional awalan +)
 * - Wajib dimulai dengan format Indonesia: 08..., 628..., atau +628...
 * - Prefix mobile Indonesia valid: 081, 082, 083, 085, 087, 088, 089, dll.
 * - Panjang nomor 10 hingga 13 digit
 * - Menolak huruf atau simbol acak (seperti "0892839r7937")
 */
export function validateIndonesianPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, normalized: '', error: 'Nomor HP wajib diisi.' }
  }

  const raw = phone.trim()

  // Cek apakah ada karakter non-digit selain tanda + di depan
  if (/[^0-9+]/.test(raw) || (raw.includes('+') && !raw.startsWith('+'))) {
    return {
      valid: false,
      normalized: '',
      error: 'Nomor HP HANYA boleh berisi angka. Jangan memasukkan huruf atau simbol lain (contoh: 08123456789).',
    }
  }

  // Normalisasi ke format standar Indonesia: 08xxxxxxxxxx
  let cleaned = raw
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.slice(3)
  } else if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2)
  }

  // Cek panjang digit
  if (cleaned.length < 10 || cleaned.length > 13) {
    return {
      valid: false,
      normalized: '',
      error: `Nomor HP harus terdiri dari 10 sampai 13 digit (Anda memasukkan ${cleaned.length} digit).`,
    }
  }

  // Regex format nomor seluler Indonesia: dimulai 08 dilanjutkan digit 1-9
  const idPhoneRegex = /^08[1-9][0-9]{7,10}$/
  if (!idPhoneRegex.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: 'Format nomor HP tidak valid. Wajib berformat seluler Indonesia (diawali 081x, 082x, 085x, 087x, 088x, 089x).',
    }
  }

  return { valid: true, normalized: cleaned }
}

/**
 * Validasi ketat alamat email:
 * - Format RFC 5322
 * - Panjang TLD minimal 2 karakter
 * - Memblokir domain email sementara / disposable
 */
export function validateStrictEmail(email: string): { valid: boolean; normalized: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, normalized: '', error: 'Email wajib diisi.' }
  }

  const normalized = email.trim().toLowerCase()

  // Cek format email RFC 5322 standar
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRegex.test(normalized) || normalized.includes('..')) {
    return {
      valid: false,
      normalized: '',
      error: 'Format email tidak valid. Masukkan email resmi yang benar (contoh: nama@gmail.com).',
    }
  }

  // Ambil domain email
  const parts = normalized.split('@')
  if (parts.length !== 2) {
    return { valid: false, normalized: '', error: 'Format email tidak valid.' }
  }

  const domain = parts[1]
  const domainParts = domain.split('.')
  const tld = domainParts[domainParts.length - 1]

  if (!tld || tld.length < 2) {
    return { valid: false, normalized: '', error: 'Domain email tidak lengkap atau tidak valid.' }
  }

  // Cek domain disposable / fake
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      normalized: '',
      error: 'Email sementara (disposable/temp mail) tidak diizinkan. Gunakan email pribadi aktif (Gmail, Yahoo, Outlook, dsb).',
    }
  }

  return { valid: true, normalized }
}

