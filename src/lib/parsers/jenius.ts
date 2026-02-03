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
  // Handle format: IDR 35,000.00 -> 35000
  // Commas as thousand separators, dot as decimal
  return parseFloat(numStr.replace(/,/g, '')) || 0
}

export function parseJenius(content: string): ParsedTransaction {
  const text = decodeHtmlEntities(content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))

  // Check if this is a credit card payment email
  // Format: "Payment in the amount of IDR10,000,000 for your Jenius Credit Card bill"
  const ccPaymentMatch = text.match(/Payment in the amount of IDR\s*([\d,]+)\s*for your Jenius Credit Card/i)
  if (ccPaymentMatch) {
    const amount = parseAmountString(ccPaymentMatch[1])
    return {
      amount,
      currency: 'IDR',
      idrAmount: amount,
      merchant: 'Jenius Credit Card Payment',
      transactionType: 'CC Payment',
    }
  }

  // Extract merchant: Merchant: GRAB* A-8TSEUA9GXDPBAV 6281384748739ID
  const merchantMatch = text.match(/Merchant:\s*(.+?)(?=\s+Transaction date)/i)
  let merchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown'

  // Clean up merchant - remove trailing ID country code pattern
  merchant = merchant.replace(/\s+\d{10,}[A-Z]{2}$/, '').trim()

  // Extract amount: Total: IDR 35,000.00
  const amountMatch = text.match(/Total:\s*IDR\s*([\d,.]+)/i)
  let amount = amountMatch ? parseAmountString(amountMatch[1]) : 0

  // Check if refund
  const isRefund = text.toLowerCase().includes('has been refunded') || merchant.toLowerCase() === 'refund'

  // Transaction type
  let transactionType = 'd-Card Transaction'
  if (isRefund) {
    transactionType = 'd-Card Refund'
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
