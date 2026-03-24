import { describe, it, expect } from 'vitest'
import {
  COMBAT_RELATED_CODES,
  MILITARY_BRANCHES,
  RETIREMENT_TYPES,
  US_STATES,
  BRANCH_MAILING_ADDRESSES,
  DOCUMENT_TYPES,
  APPLICATION_STEPS,
  PAYMENT_AMOUNT,
  SESSION_TIMEOUT_MINUTES,
} from '../constants'

describe('COMBAT_RELATED_CODES', () => {
  it('contains all 9 combat-related codes', () => {
    const codes = Object.keys(COMBAT_RELATED_CODES)
    expect(codes).toContain('PH')
    expect(codes).toContain('AC')
    expect(codes).toContain('HS')
    expect(codes).toContain('SW')
    expect(codes).toContain('IN')
    expect(codes).toContain('AO')
    expect(codes).toContain('RE')
    expect(codes).toContain('GW')
    expect(codes).toContain('MG')
    expect(codes.length).toBe(9)
  })

  it('has name and description for each code', () => {
    for (const [key, value] of Object.entries(COMBAT_RELATED_CODES)) {
      expect(value.code).toBe(key)
      expect(value.name).toBeTruthy()
      expect(value.description).toBeTruthy()
    }
  })
})

describe('MILITARY_BRANCHES', () => {
  it('contains at least 5 branches', () => {
    expect(MILITARY_BRANCHES.length).toBeGreaterThanOrEqual(5)
  })

  it('includes Army, Navy, Air Force, Marine Corps, Coast Guard', () => {
    const values = MILITARY_BRANCHES.map((b) => b.value)
    expect(values).toContain('army')
    expect(values).toContain('navy')
    expect(values).toContain('air_force')
    expect(values).toContain('marine_corps')
    expect(values).toContain('coast_guard')
  })
})

describe('RETIREMENT_TYPES', () => {
  it('includes common retirement types', () => {
    const values = RETIREMENT_TYPES.map((t) => t.value)
    expect(values).toContain('20_years')
    expect(values).toContain('chapter_61')
  })
})

describe('US_STATES', () => {
  it('contains 50+ entries (states + territories)', () => {
    expect(US_STATES.length).toBeGreaterThanOrEqual(50)
  })
})

describe('BRANCH_MAILING_ADDRESSES', () => {
  it('has addresses for main branches', () => {
    expect(BRANCH_MAILING_ADDRESSES).toHaveProperty('army')
    expect(BRANCH_MAILING_ADDRESSES).toHaveProperty('navy')
    expect(BRANCH_MAILING_ADDRESSES).toHaveProperty('air_force')
    expect(BRANCH_MAILING_ADDRESSES).toHaveProperty('coast_guard')
  })

  it('each address has name and address fields', () => {
    for (const branch of Object.values(BRANCH_MAILING_ADDRESSES)) {
      expect(branch.name).toBeTruthy()
      expect(branch.address).toBeTruthy()
    }
  })
})

describe('DOCUMENT_TYPES', () => {
  it('includes required DD214', () => {
    const dd214 = DOCUMENT_TYPES.find((d) => d.value === 'dd214')
    expect(dd214).toBeTruthy()
    expect(dd214?.required).toBe(true)
  })
})

describe('APPLICATION_STEPS', () => {
  it('has the expected number of steps', () => {
    expect(APPLICATION_STEPS.length).toBeGreaterThanOrEqual(6)
  })
})

describe('Config constants', () => {
  it('PAYMENT_AMOUNT is a positive number', () => {
    expect(PAYMENT_AMOUNT).toBeGreaterThan(0)
  })

  it('SESSION_TIMEOUT_MINUTES is reasonable', () => {
    expect(SESSION_TIMEOUT_MINUTES).toBeGreaterThanOrEqual(5)
    expect(SESSION_TIMEOUT_MINUTES).toBeLessThanOrEqual(120)
  })
})
