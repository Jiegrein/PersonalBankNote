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

function parseIndonesianAmount(amountStr: string): number {
  // Indonesian format: Rp500.000 or Rp1.000.000
  // Dot is thousand separator, no decimal
  return parseInt(amountStr.replace(/\./g, ''), 10) || 0
}

export function parseKrom(content: string): ParsedTransaction {
  const text = decodeHtmlEntities(content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))

  // Default values
  let amount = 0
  let merchant = 'Unknown'
  let transactionType = 'Transfer'

  // Check for transfer notification
  // Format: "Jumlah: Rp500.000"
  const amountMatch = text.match(/Jumlah:\s*Rp\s*([\d.]+)/i)
  if (amountMatch) {
    amount = parseIndonesianAmount(amountMatch[1])
  }

  // Extract recipient from "Ke: DANIEL ABEDNEGO • 7293872124"
  // Handle both bullet point (•) and regular separators
  const recipientMatch = text.match(/Ke:\s*([^•\d]+)/i)
  if (recipientMatch) {
    merchant = recipientMatch[1].trim()
    // Clean up trailing whitespace and special chars
    merchant = merchant.replace(/[\s•-]+$/, '').trim()
  }

  // Determine transaction type based on content
  if (text.includes('Transfer Berhasil') || text.includes('mengirim dana')) {
    transactionType = 'Transfer Out'
  } else if (text.includes('menerima dana') || text.includes('Dana Masuk')) {
    transactionType = 'Transfer In'
    // Incoming transfers might be negative (credit to account)
  }

  // Check for payment transactions (QRIS, etc.)
  if (text.includes('Pembayaran Berhasil') || text.includes('QRIS')) {
    transactionType = 'Payment'
    // For payments, try to get merchant name differently
    const qrisMerchantMatch = text.match(/(?:Merchant|Tujuan):\s*(.+?)(?=\s+(?:Tanggal|Jumlah|Metode))/i)
    if (qrisMerchantMatch) {
      merchant = qrisMerchantMatch[1].trim()
    }
  }

  return {
    amount,
    currency: 'IDR',
    idrAmount: amount,
    merchant,
    transactionType,
  }
}
