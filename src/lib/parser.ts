export interface ParsedTransaction {
  amount: number
  currency: string
  idrAmount: number | null
  merchant: string
}

export function extractAmount(text: string): number {
  // Match various number formats: 50.000, 1,500,000, 99.99
  const patterns = [
    /(?:Rp|IDR|USD|CNY|PHP|SGD|\$|¥|₱)\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:Rp|IDR|USD|CNY|PHP|SGD)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      // Clean the number string
      let numStr = match[1]

      // Handle Indonesian format (50.000 = 50000) vs decimal (99.99)
      // If has dot and more than 2 digits after, it's thousand separator
      if (numStr.includes('.') && numStr.split('.').pop()!.length > 2) {
        numStr = numStr.replace(/\./g, '')
      }

      // Remove commas (thousand separators)
      numStr = numStr.replace(/,/g, '')

      // If still has dot, it's decimal
      return parseFloat(numStr) || 0
    }
  }

  return 0
}

export function extractCurrency(text: string): string {
  const upperText = text.toUpperCase()

  if (upperText.includes('RP') || upperText.includes('IDR')) return 'IDR'
  if (upperText.includes('USD') || upperText.includes('$')) return 'USD'
  if (upperText.includes('CNY') || upperText.includes('¥')) return 'CNY'
  if (upperText.includes('PHP') || upperText.includes('₱')) return 'PHP'
  if (upperText.includes('SGD')) return 'SGD'
  if (upperText.includes('JPY')) return 'JPY'
  if (upperText.includes('EUR') || upperText.includes('€')) return 'EUR'

  // Default to IDR
  return 'IDR'
}

export function extractMerchant(text: string): string {
  // Common patterns for merchant extraction
  const patterns = [
    /(?:at|to|from|@)\s+([A-Z][A-Z0-9\s]+?)(?:\s+on|\s+for|\s+dated|$|\.|,)/i,
    /(?:merchant|store|shop):\s*([A-Z][A-Z0-9\s]+?)(?:\s|$|\.|,)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return 'Unknown'
}

export function parseTransaction(content: string): ParsedTransaction {
  const amount = extractAmount(content)
  const currency = extractCurrency(content)
  const merchant = extractMerchant(content)

  // Set idrAmount only if currency is IDR
  const idrAmount = currency === 'IDR' ? amount : null

  return {
    amount,
    currency,
    idrAmount,
    merchant,
  }
}
