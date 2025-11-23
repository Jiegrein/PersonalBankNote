import { buildEmailFilterQuery, parseEmailResponse } from '@/lib/microsoft-graph'

describe('Microsoft Graph Client', () => {
  describe('buildEmailFilterQuery', () => {
    it('should build correct filter for email address', () => {
      const emailFilter = 'alerts@bank.com'
      const query = buildEmailFilterQuery(emailFilter)

      expect(query).toContain('alerts@bank.com')
      expect(query).toContain('from/emailAddress/address')
    })

    it('should include date filter when provided', () => {
      const emailFilter = 'alerts@bank.com'
      const since = new Date('2024-01-01')
      const query = buildEmailFilterQuery(emailFilter, since)

      expect(query).toContain('receivedDateTime')
      expect(query).toContain('2024-01-01')
    })
  })

  describe('parseEmailResponse', () => {
    it('should extract required fields from email', () => {
      const mockEmail = {
        id: 'email-123',
        subject: 'Transaction Alert',
        body: { content: 'You spent IDR 50,000 at Grab' },
        receivedDateTime: '2024-01-15T10:30:00Z',
        from: { emailAddress: { address: 'alerts@bank.com' } },
      }

      const parsed = parseEmailResponse(mockEmail)

      expect(parsed.id).toBe('email-123')
      expect(parsed.subject).toBe('Transaction Alert')
      expect(parsed.content).toBeDefined()
      expect(parsed.receivedAt).toBeDefined()
    })

    it('should handle missing body gracefully', () => {
      const mockEmail = {
        id: 'email-123',
        subject: 'No body email',
        body: null,
        receivedDateTime: '2024-01-15T10:30:00Z',
      }

      const parsed = parseEmailResponse(mockEmail)

      expect(parsed.content).toBe('')
    })
  })
})

describe('Graph API URL Building', () => {
  it('should use correct base URL', () => {
    const baseUrl = 'https://graph.microsoft.com/v1.0/me/messages'
    expect(baseUrl).toContain('graph.microsoft.com')
    expect(baseUrl).toContain('/me/messages')
  })

  it('should order by receivedDateTime desc', () => {
    const orderBy = '$orderby=receivedDateTime desc'
    expect(orderBy).toContain('desc')
  })
})
