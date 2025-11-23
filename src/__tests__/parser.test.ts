import { parseTransaction, extractAmount, extractCurrency, extractMerchant } from '@/lib/parser'

describe('Email Parser', () => {
  describe('extractAmount', () => {
    it('should extract IDR amount with Rp prefix', () => {
      const text = 'You spent Rp 50.000 at Store'
      expect(extractAmount(text)).toBe(50000)
    })

    it('should extract IDR amount with IDR prefix', () => {
      const text = 'Transaction: IDR 1,500,000'
      expect(extractAmount(text)).toBe(1500000)
    })

    it('should extract amount with decimal', () => {
      const text = 'Amount: USD 99.99'
      expect(extractAmount(text)).toBe(99.99)
    })

    it('should return 0 if no amount found', () => {
      const text = 'No amount here'
      expect(extractAmount(text)).toBe(0)
    })
  })

  describe('extractCurrency', () => {
    it('should detect IDR from Rp', () => {
      const text = 'Rp 50.000'
      expect(extractCurrency(text)).toBe('IDR')
    })

    it('should detect IDR', () => {
      const text = 'IDR 1,000,000'
      expect(extractCurrency(text)).toBe('IDR')
    })

    it('should detect USD', () => {
      const text = 'USD 100.00'
      expect(extractCurrency(text)).toBe('USD')
    })

    it('should detect CNY', () => {
      const text = 'CNY 500'
      expect(extractCurrency(text)).toBe('CNY')
    })

    it('should default to IDR', () => {
      const text = '50000'
      expect(extractCurrency(text)).toBe('IDR')
    })
  })

  describe('extractMerchant', () => {
    it('should extract merchant after "at"', () => {
      const text = 'Payment at GRAB TAXI on 2024-01-15'
      expect(extractMerchant(text)).toBe('GRAB TAXI')
    })

    it('should extract merchant after "to"', () => {
      const text = 'Transfer to TOKOPEDIA completed'
      expect(extractMerchant(text)).toBe('TOKOPEDIA')
    })

    it('should return Unknown if not found', () => {
      const text = 'Transaction completed'
      expect(extractMerchant(text)).toBe('Unknown')
    })
  })

  describe('parseTransaction', () => {
    it('should parse complete transaction', () => {
      const content = 'You spent Rp 50.000 at GRAB TAXI on 2024-01-15'
      const result = parseTransaction(content)

      expect(result.amount).toBe(50000)
      expect(result.currency).toBe('IDR')
      expect(result.merchant).toBe('GRAB TAXI')
    })

    it('should handle foreign currency', () => {
      const content = 'Payment of USD 25.50 at AMAZON'
      const result = parseTransaction(content)

      expect(result.amount).toBe(25.50)
      expect(result.currency).toBe('USD')
      expect(result.idrAmount).toBeNull()
    })

    it('should set idrAmount for IDR transactions', () => {
      const content = 'Rp 100.000 at SHOPEE'
      const result = parseTransaction(content)

      expect(result.currency).toBe('IDR')
      expect(result.idrAmount).toBe(100000)
    })
  })
})
