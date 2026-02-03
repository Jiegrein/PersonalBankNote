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
  // Handle Indonesian formats:
  // Rp4.480.000,00 -> 4480000 (dots as thousand sep, comma as decimal)
  // IDR 33.999 -> 33999 (dots as thousand sep, no decimal)

  // If has comma, treat dots as thousand separators
  if (numStr.includes(',')) {
    return parseFloat(numStr.replace(/\./g, '').replace(',', '.')) || 0
  }

  // If dot with 3+ digits after, it's a thousand separator
  if (numStr.match(/\.\d{3}/)) {
    return parseFloat(numStr.replace(/\./g, '')) || 0
  }

  // Otherwise treat as regular number
  return parseFloat(numStr.replace(/,/g, '')) || 0
}

export function parseBCACredit(content: string): ParsedTransaction {
  const text = decodeHtmlEntities(content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))

  // Extract merchant
  const merchantMatch = text.match(/Merchant\s*\/\s*ATM\s*:\s*(.+?)(?=\s+Jenis Transaksi)/i)
  const merchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown'

  // Extract transaction type (DOMESTIK, E-COMMERCE, etc.)
  const typeMatch = text.match(/Jenis Transaksi\s*:\s*(.+?)(?=\s+Otentikasi|\s+Pada Tanggal)/i)
  let transactionType = typeMatch ? typeMatch[1].trim() : 'Credit Card'

  // Check if this is a reversal/void transaction
  if (text.toLowerCase().includes('reversal/void') || text.toLowerCase().includes('transaksi reversal')) {
    transactionType = `Reversal - ${transactionType}`
  }

  // Extract amount: Sejumlah : Rp4.480.000,00 or IDR 33.999
  const amountMatch = text.match(/Sejumlah\s*:\s*(?:Rp|IDR)\s*([\d.,]+)/i)
  let amount = amountMatch ? parseAmountString(amountMatch[1]) : 0

  // Reversals/refunds should be negative
  const isReversal = text.toLowerCase().includes('reversal/void') || text.toLowerCase().includes('transaksi reversal')
  if (isReversal) {
    amount = -amount
  }

  return {
    amount,
    currency: 'IDR',
    idrAmount: amount,
    merchant,
    transactionType,
  }
}
