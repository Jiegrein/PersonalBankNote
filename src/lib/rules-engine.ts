export interface Rule {
  id: string
  condition: string // 'contains', 'startsWith', 'endsWith', 'equals'
  conditionValue: string
  category: string
  priority: number
}

export function matchRule(text: string, rule: Rule): boolean {
  const lowerText = text.toLowerCase()
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
    default:
      return false
  }
}

export function applyRules(text: string, rules: Rule[]): string {
  if (!rules.length) return 'Uncategorized'

  // Sort by priority (higher priority first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    if (matchRule(text, rule)) {
      return rule.category
    }
  }

  return 'Uncategorized'
}
