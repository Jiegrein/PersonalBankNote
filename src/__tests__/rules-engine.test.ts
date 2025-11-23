import { applyRules, matchRule } from '@/lib/rules-engine'

describe('Rules Engine', () => {
  const mockRules = [
    { id: '1', condition: 'contains', conditionValue: 'GRAB', category: 'Transport', priority: 1 },
    { id: '2', condition: 'contains', conditionValue: 'TOKOPEDIA', category: 'Shopping', priority: 1 },
    { id: '3', condition: 'startsWith', conditionValue: 'ALLIANZ', category: 'Insurance', priority: 2 },
    { id: '4', condition: 'equals', conditionValue: 'NETFLIX', category: 'Entertainment', priority: 1 },
  ]

  describe('matchRule', () => {
    it('should match "contains" condition', () => {
      const rule = mockRules[0]
      expect(matchRule('Payment at GRAB TAXI', rule)).toBe(true)
      expect(matchRule('Payment at SHOPEE', rule)).toBe(false)
    })

    it('should match "startsWith" condition', () => {
      const rule = mockRules[2]
      expect(matchRule('ALLIANZ INSURANCE PAYMENT', rule)).toBe(true)
      expect(matchRule('Payment to ALLIANZ', rule)).toBe(false)
    })

    it('should match "equals" condition', () => {
      const rule = mockRules[3]
      expect(matchRule('NETFLIX', rule)).toBe(true)
      expect(matchRule('NETFLIX INC', rule)).toBe(false)
    })

    it('should be case insensitive', () => {
      const rule = mockRules[0]
      expect(matchRule('grab taxi', rule)).toBe(true)
      expect(matchRule('Grab Food', rule)).toBe(true)
    })
  })

  describe('applyRules', () => {
    it('should return matching category', () => {
      const category = applyRules('Payment at GRAB TAXI', mockRules)
      expect(category).toBe('Transport')
    })

    it('should return highest priority match', () => {
      // ALLIANZ has priority 2, higher than others
      const category = applyRules('ALLIANZ GRAB', mockRules)
      expect(category).toBe('Insurance')
    })

    it('should return Uncategorized if no match', () => {
      const category = applyRules('Random merchant', mockRules)
      expect(category).toBe('Uncategorized')
    })

    it('should handle empty rules', () => {
      const category = applyRules('GRAB', [])
      expect(category).toBe('Uncategorized')
    })
  })
})
