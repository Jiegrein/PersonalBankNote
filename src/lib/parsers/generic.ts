import type { ParsedTransaction } from './index'

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function extractAmount(text: string): number {
  const patterns = [
    /(?:Rp|IDR|USD|CNY|PHP|SGD|\$|¥|₱)\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:Rp|IDR|USD|CNY|PHP|SGD)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      let numStr = match[1]

      if (numStr.includes('.') && numStr.split('.').pop()!.length > 2) {
        numStr = numStr.replace(/\./g, '')
      }

      numStr = numStr.replace(/,/g, '')

      return parseFloat(numStr) || 0
    }
  }

  return 0
}

function extractCurrency(text: string): string {
  const upperText = text.toUpperCase()

  if (upperText.includes('RP') || upperText.includes('IDR')) return 'IDR'
  if (upperText.includes('USD') || upperText.includes('$')) return 'USD'
  if (upperText.includes('CNY') || upperText.includes('¥')) return 'CNY'
  if (upperText.includes('PHP') || upperText.includes('₱')) return 'PHP'
  if (upperText.includes('SGD')) return 'SGD'
  if (upperText.includes('JPY')) return 'JPY'
  if (upperText.includes('EUR') || upperText.includes('€')) return 'EUR'

  return 'IDR'
}

function extractMerchant(text: string): string {
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

export function parseGeneric(content: string): ParsedTransaction {
  const plainText = decodeHtmlEntities(content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))

  const amount = extractAmount(plainText)
  const currency = extractCurrency(plainText)
  const merchant = extractMerchant(plainText)
  const idrAmount = currency === 'IDR' ? amount : null

  return {
    amount,
    currency,
    idrAmount,
    merchant,
    transactionType: 'Unknown',
  }
}
