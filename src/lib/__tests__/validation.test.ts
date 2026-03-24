import { describe, it, expect } from 'vitest'
import {
  personalInfoSchema,
  militaryServiceSchema,
  vaDisabilityInfoSchema,
  disabilityClaimSchema,
  secondaryConditionSchema,
  loginSchema,
  registerSchema,
  maskSSN,
  validateFileUpload,
} from '../validation'

describe('personalInfoSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    ssn: '123-45-6789',
    dateOfBirth: '1980-01-01',
    email: 'john@example.com',
    phone: '555-123-4567',
    addressLine1: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
  }

  it('accepts valid personal info', () => {
    const result = personalInfoSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects missing first name', () => {
    const result = personalInfoSchema.safeParse({ ...validData, firstName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid SSN format', () => {
    const result = personalInfoSchema.safeParse({ ...validData, ssn: '12345' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = personalInfoSchema.safeParse({ ...validData, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts optional middleInitial', () => {
    const result = personalInfoSchema.safeParse({ ...validData, middleInitial: 'A' })
    expect(result.success).toBe(true)
  })

  it('rejects short zip code', () => {
    const result = personalInfoSchema.safeParse({ ...validData, zipCode: '123' })
    expect(result.success).toBe(false)
  })
})

describe('militaryServiceSchema', () => {
  const validData = {
    branch: 'army',
    retiredRank: 'E-7',
    retirementDate: '2020-01-01',
    retirementType: '20_plus_years',
  }

  it('accepts valid military service data', () => {
    const result = militaryServiceSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects missing branch', () => {
    const result = militaryServiceSchema.safeParse({ ...validData, branch: '' })
    expect(result.success).toBe(false)
  })

  it('accepts optional yearsOfService', () => {
    const result = militaryServiceSchema.safeParse({ ...validData, yearsOfService: 22 })
    expect(result.success).toBe(true)
  })

  it('rejects years of service over 50', () => {
    const result = militaryServiceSchema.safeParse({ ...validData, yearsOfService: 51 })
    expect(result.success).toBe(false)
  })
})

describe('vaDisabilityInfoSchema', () => {
  const validData = {
    vaFileNumber: '12345678',
    currentVaRating: 70,
    vaDecisionDate: '2023-06-15',
    hasVaWaiver: false,
    receivesCrdp: true,
  }

  it('accepts valid VA disability info', () => {
    const result = vaDisabilityInfoSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects VA rating below 10', () => {
    const result = vaDisabilityInfoSchema.safeParse({ ...validData, currentVaRating: 5 })
    expect(result.success).toBe(false)
  })

  it('rejects VA rating above 100', () => {
    const result = vaDisabilityInfoSchema.safeParse({ ...validData, currentVaRating: 110 })
    expect(result.success).toBe(false)
  })
})

describe('disabilityClaimSchema', () => {
  const validData = {
    disabilityTitle: 'PTSD',
    bodyPartAffected: 'Mental health',
    dateAwardedByVa: '2022-01-01',
    initialRatingPercentage: 50,
    currentRatingPercentage: 70,
    combatRelatedCode: 'AC',
    unitOfAssignment: '1st Infantry Division',
    locationOfInjury: 'Baghdad, Iraq',
    descriptionOfEvent: 'During deployment to Baghdad in 2005, experienced direct combat engagement resulting in psychological trauma from extended exposure to hostile fire and IED attacks.',
    receivedPurpleHeart: false,
    hasSecondaryConditions: false,
  }

  it('accepts valid disability claim', () => {
    const result = disabilityClaimSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects description under 50 characters', () => {
    const result = disabilityClaimSchema.safeParse({ ...validData, descriptionOfEvent: 'Too short' })
    expect(result.success).toBe(false)
  })

  it('rejects missing combat-related code', () => {
    const result = disabilityClaimSchema.safeParse({ ...validData, combatRelatedCode: '' })
    expect(result.success).toBe(false)
  })
})

describe('secondaryConditionSchema', () => {
  it('accepts valid secondary condition', () => {
    const result = secondaryConditionSchema.safeParse({
      description: 'Sleep apnea secondary to PTSD',
      percentage: 30,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty description', () => {
    const result = secondaryConditionSchema.safeParse({
      description: '',
      percentage: 30,
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'MyPassword123!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects password under 12 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'MyPassword123!',
      confirmPassword: 'MyPassword123!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'MyPassword123!',
      confirmPassword: 'DifferentPassword1!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without uppercase letter', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword123!',
      confirmPassword: 'mypassword123!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without special character', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'MyPassword1234',
      confirmPassword: 'MyPassword1234',
    })
    expect(result.success).toBe(false)
  })
})

describe('maskSSN', () => {
  it('masks SSN correctly', () => {
    expect(maskSSN('123-45-6789')).toBe('XXX-XX-6789')
  })

  it('returns empty string for empty input', () => {
    expect(maskSSN('')).toBe('')
  })
})

describe('validateFileUpload', () => {
  it('accepts a valid PDF file', () => {
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB
    const result = validateFileUpload(file)
    expect(result.valid).toBe(true)
  })

  it('accepts a valid image file', () => {
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 })
    const result = validateFileUpload(file)
    expect(result.valid).toBe(true)
  })

  it('rejects a file that is too large', () => {
    const file = new File(['content'], 'huge.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 60 * 1024 * 1024 }) // 60MB
    const result = validateFileUpload(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50MB')
  })

  it('rejects unsupported file types', () => {
    const file = new File(['content'], 'script.js', { type: 'application/javascript' })
    Object.defineProperty(file, 'size', { value: 1024 })
    const result = validateFileUpload(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not allowed')
  })
})
