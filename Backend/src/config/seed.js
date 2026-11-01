/**
 * Database Seeder
 * Seeds clinic, staff users, and treatment categories into Supabase.
 */
const bcrypt = require('bcryptjs')
const { clinicDb, userDb, treatmentCategoryDb } = require('../db')

const DEFAULT_TREATMENT_CATEGORIES = [
  { name: 'General Consultation', code: 'CONSULT', default_duration_minutes: 30, default_follow_up_days: 30 },
  { name: 'Orthodontics', code: 'ORTHO', default_duration_minutes: 45, default_follow_up_days: 28 },
  { name: 'Root Canal Treatment', code: 'RCT', default_duration_minutes: 60, default_follow_up_days: 10 },
  { name: 'Tooth Extraction', code: 'EXTRACT', default_duration_minutes: 30, default_follow_up_days: 5 },
  { name: 'Cavity Filling', code: 'FILL', default_duration_minutes: 45, default_follow_up_days: 30 },
  { name: 'Cleaning & Scaling', code: 'SCALE', default_duration_minutes: 45, default_follow_up_days: 180 },
  { name: 'Dental Implant', code: 'IMPLANT', default_duration_minutes: 90, default_follow_up_days: 14 },
  { name: 'Prosthodontics & Crown', code: 'CROWN', default_duration_minutes: 60, default_follow_up_days: 7 },
  { name: 'Emergency Dental', code: 'EMERG', default_duration_minutes: 30, default_follow_up_days: 3 },
  { name: 'X-Ray & Diagnosis', code: 'XRAY', default_duration_minutes: 20, default_follow_up_days: 7 },
]

const DEFAULT_STAFF = [
  {
    name: 'Dr. Admin',
    email: 'admin@dwarkadental.com',
    password: 'admin123',
    role: 'admin',
    phone: '+91 98765 00001',
  },
  {
    name: 'Dr. Neha Sharma',
    email: 'doctor@dwarkadental.com',
    password: 'doctor123',
    role: 'doctor',
    phone: '+91 98765 00002',
    specialization: 'General Dentistry',
  },
  {
    name: 'Dr. Rohan Mehta',
    email: 'rohan@dwarkadental.com',
    password: 'doctor123',
    role: 'doctor',
    phone: '+91 98765 00004',
    specialization: 'Endodontics & RCT',
  },
  {
    name: 'Dr. Kavita Iyer',
    email: 'kavita@dwarkadental.com',
    password: 'doctor123',
    role: 'doctor',
    phone: '+91 98765 00005',
    specialization: 'Periodontics',
  },
  {
    name: 'Dr. Arjun Kapoor',
    email: 'arjun@dwarkadental.com',
    password: 'doctor123',
    role: 'doctor',
    phone: '+91 98765 00006',
    specialization: 'Implantology & Prosthodontics',
  },
  {
    name: 'Priya Patel',
    email: 'receptionist@dwarkadental.com',
    password: 'receptionist123',
    role: 'receptionist',
    phone: '+91 98765 00003',
  },
]

async function seedDatabase() {
  try {
    // ── 1. Seed Clinic ──────────────────────────────────────────────────────
    const clinic = await clinicDb.getDefaultClinic()
    console.log('[Seed] Clinic ready:', clinic.name)

    // ── 2. Seed Staff Users with bcrypt hashed passwords ───────────────────
    for (const staff of DEFAULT_STAFF) {
      let existing = await userDb.findByEmail(staff.email)
      if (!existing) {
        const password_hash = await bcrypt.hash(staff.password, 12)
        await userDb.createUser({
          clinic_id: clinic.id,
          name: staff.name,
          email: staff.email,
          password_hash,
          role: staff.role,
          phone: staff.phone,
          specialization: staff.specialization || null,
          status: 'active',
        })
        console.log(`[Seed] User created: ${staff.email} (${staff.role})`)
      } else {
        console.log(`[Seed] User already exists: ${staff.email}`)
      }
    }

    // ── 3. Seed Treatment Categories ────────────────────────────────────────
    for (const cat of DEFAULT_TREATMENT_CATEGORIES) {
      await treatmentCategoryDb.upsertByCode(cat.code, clinic.id, {
        ...cat,
        clinic_id: clinic.id,
        is_active: true,
      })
    }
    console.log(`[Seed] ${DEFAULT_TREATMENT_CATEGORIES.length} treatment categories updated/seeded`)

    console.log('[Seed] Database seeding complete!')
  } catch (err) {
    console.error('[Seed] Seeding error:', err)
  }
}

module.exports = { seedDatabase }
