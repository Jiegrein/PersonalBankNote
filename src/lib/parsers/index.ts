import { parseBCADebit } from './bca-debit'
import { parseBCACredit } from './bca-credit'
import { parseJenius } from './jenius'
import { parseKrom } from './krom'
import { parseGeneric } from './generic'

export interface ParsedTransaction {
  amount: number
  currency: string
  idrAmount: number | null
  merchant: string
  transactionType: string
}

export type ParserFn = (content: string) => ParsedTransaction

const parsers: Record<string, ParserFn> = {
  'bca-debit': parseBCADebit,
  'bca-credit': parseBCACredit,
  'jenius': parseJenius,
  'krom': parseKrom,
  'generic': parseGeneric,
}

export const PARSER_OPTIONS = [
  { value: 'bca-debit', label: 'BCA Debit (myBCA)' },
  { value: 'bca-credit', label: 'BCA Credit Card' },
  { value: 'jenius', label: 'Jenius SMBC' },
  { value: 'krom', label: 'Krom' },
  { value: 'generic', label: 'Generic' },
] as const

export type ParserType = (typeof PARSER_OPTIONS)[number]['value']

export function parseTransaction(parserType: string, content: string): ParsedTransaction {
  const parser = parsers[parserType] || parsers['generic']
  return parser(content)
}
