export interface Rule {
  id: string
  condition: string // 'contains', 'startsWith', 'endsWith', 'equals', 'merchantContains', 'merchantEquals'
  conditionValue: string
  category: string
  priority: number
  bankType?: string | null // null = all banks, 'debit' or 'credit' = specific type only
}

export function matchRule(text: string, merchant: string, rule: Rule): boolean {
  const lowerText = text.toLowerCase()
  const lowerMerchant = merchant.toLowerCase()
  const lowerValue = rule.conditionValue.toLowerCase()

  switch (rule.condition) {
    case 'contains':
      return lowerText.includes(lowerValue)
    case 'startsWith':
      return lowerText.startsWith(lowerValue)
    case 'endsWith':
      return lowerText.endsWith(lowerValue)
    case 'equals':
      return lowerText === lowerValue
    case 'merchantContains':
      return lowerMerchant.includes(lowerValue)
    case 'merchantStartsWith':
      return lowerMerchant.startsWith(lowerValue)
    case 'merchantEndsWith':
      return lowerMerchant.endsWith(lowerValue)
    case 'merchantEquals':
      return lowerMerchant === lowerValue
    default:
      return false
  }
}

export function applyRules(text: string, rules: Rule[], bankType?: string, merchant?: string): string {
  if (!rules.length) return 'Uncategorized'

  // Filter rules by bank type: include rules with no bankType (applies to all) or matching bankType
  const applicableRules = rules.filter(rule =>
    !rule.bankType || rule.bankType === bankType
  )

  // Sort by priority (higher priority first)
  const sortedRules = [...applicableRules].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    if (matchRule(text, merchant || '', rule)) {
      return rule.category
    }
  }

  return 'Uncategorized'
}
