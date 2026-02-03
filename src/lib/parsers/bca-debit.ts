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

function parseAmountString(numStr: string): number {
  let cleaned = numStr.replace(/,/g, '')
  if (cleaned.match(/\.\d{2}$/)) {
    return parseFloat(cleaned) || 0
  }
  cleaned = cleaned.replace(/\./g, '')
  return parseFloat(cleaned) || 0
}

function cleanMerchantName(merchant: string): string {
  // Remove trailing patterns like "billdesc : IDR 1,234.00 Bill" or similar
  return merchant
    .replace(/\s+billdesc\s*:.*$/i, '')
    .replace(/\s+IDR\s*[\d.,]+.*$/i, '')
    .replace(/\s+Bill\s*$/i, '')
    .replace(/\s+\/\s*$/, '')
    .trim()
}

function extractBCAMerchant(text: string): string {
  const typeMatch = text.match(/(?:Transaction|Transfer) Type\s*:\s*(.+?)(?=\s+Source of Fund|\s+Flazz Card|\s+Payment to\s*:)/i)
  const transactionType = typeMatch ? typeMatch[1].trim() : ''

  if (transactionType.toLowerCase().includes('qris')) {
    const paymentTo = text.match(/Payment to\s*:\s*([^:]+?)(?=\s+Merchant|\s+Acquirer)/i)
    if (paymentTo) {
      return cleanMerchantName(paymentTo[1].trim())
    }
  }

  if (transactionType.toLowerCase().includes('transfer')) {
    if (transactionType.toLowerCase().includes('bca account')) {
      const accountMatch = text.match(/Beneficiary Account\s*:\s*(\S+)/i)
      const nameMatch = text.match(/Beneficiary Name\s*:\s*(.+?)(?=\s+Save to|\s+Transfer Amount)/i)
      if (accountMatch && nameMatch) {
        return cleanMerchantName(`${accountMatch[1].trim()} - ${nameMatch[1].trim()}`)
      }
    }
    // Virtual Account - stop at billdesc, Pay Amount, Total, Description, or IDR followed by amount
    const companyMatch = text.match(/Company\/Product Name\s*:\s*(.+?)(?=\s+billdesc|\s+Pay Amount|\s+Total|\s+Description|\s+IDR\s*[\d.,])/i)
    if (companyMatch) {
      return cleanMerchantName(companyMatch[1].trim())
    }
    const beneficiaryMatch = text.match(/Beneficiary Name\s*:\s*(.+?)(?=\s+Save to|\s+Transfer)/i)
    if (beneficiaryMatch) {
      return cleanMerchantName(beneficiaryMatch[1].trim())
    }
    return transactionType
  }

  if (transactionType.toLowerCase().includes('credit') || transactionType.toLowerCase().includes('paylater')) {
    const nameMatch = text.match(/Name\s*:\s*(.+?)(?=\s+Total|$)/i)
    if (nameMatch) {
      return nameMatch[1].trim()
    }
    return transactionType
  }

  if (transactionType) {
    return transactionType
  }

  return 'Unknown'
}

export function parseBCADebit(content: string): ParsedTransaction {
  const text = decodeHtmlEntities(content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))

  const merchant = extractBCAMerchant(text)
  const currency = 'IDR'

  const typeMatch = text.match(/(?:Transaction|Transfer) Type\s*:\s*(.+?)(?=\s+Source of Fund|\s+Flazz Card|\s+Payment to\s*:)/i)
  const transactionType = typeMatch ? typeMatch[1].trim() : 'Unknown'

  let amount = 0

  if (text.includes('Credit Card') || text.includes('Paylater')) {
    const match = text.match(/Total Payment\s*:\s*IDR\s*([\d.,]+)/i)
    if (match) {
      amount = parseAmountString(match[1])
    }
  } else if (text.toLowerCase().includes('flazz')) {
    const match = text.match(/Top Up Amount\s*:\s*IDR\s*([\d.,]+)/i)
    if (match) {
      amount = parseAmountString(match[1])
    }
  } else if (text.toLowerCase().includes('qris')) {
    const match = text.match(/Total Payment\s*:\s*IDR\s*([\d.,]+)/i)
    if (match) {
      amount = parseAmountString(match[1])
    }
  } else {
    const patterns = [
      /Total Payment\s*:\s*IDR\s*([\d.,]+)/i,
      /Amount\s*:\s*IDR\s*([\d.,]+)/i,
      /IDR\s*([\d.,]+)/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        amount = parseAmountString(match[1])
        break
      }
    }
  }

  return {
    amount,
    currency,
    idrAmount: amount,
    merchant,
    transactionType,
  }
}
