const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'

export interface EmailMessage {
  id: string
  subject: string
  content: string
  receivedAt: Date
  from: string
}

interface GraphEmailResponse {
  id: string
  subject: string
  body: { content: string } | null
  receivedDateTime: string
  from?: { emailAddress: { address: string } }
}

export function parseEmailResponse(email: GraphEmailResponse): EmailMessage {
  return {
    id: email.id,
    subject: email.subject || '',
    content: email.body?.content || '',
    receivedAt: new Date(email.receivedDateTime),
    from: email.from?.emailAddress?.address || '',
  }
}

export async function fetchEmails(
  accessToken: string,
  emailFilter: string,
  since?: Date,
  top: number = 200
): Promise<EmailMessage[]> {
  const url = new URL(`${GRAPH_BASE_URL}/me/messages`)

  // Build search query with sender and date range
  let searchQuery = `from:${emailFilter}`
  if (since) {
    // Add date filter to search query (received >= since)
    const sinceStr = since.toISOString().split('T')[0]
    searchQuery += ` received>=${sinceStr}`
  }

  url.searchParams.set('$search', `"${searchQuery}"`)
  url.searchParams.set('$top', top.toString())
  url.searchParams.set('$select', 'id,subject,body,receivedDateTime,from')

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch emails: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const emails: GraphEmailResponse[] = data.value || []

  // Subjects to exclude (billing statements, reminders, failed transactions, etc.)
  const excludedSubjectPatterns = [
    /billing statement/i,
    /due in \d+ days/i,
    /unsuccessful/i,
  ]

  // Filter client-side for exact sender match (Graph search is fuzzy)
  return emails
    .map(parseEmailResponse)
    .filter(email => email.from.toLowerCase() === emailFilter.toLowerCase())
    .filter(email => !excludedSubjectPatterns.some(pattern => pattern.test(email.subject)))
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
}

export async function fetchEmailById(
  accessToken: string,
  emailId: string
): Promise<EmailMessage> {
  const url = `${GRAPH_BASE_URL}/me/messages/${emailId}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch email: ${response.status}`)
  }

  const email: GraphEmailResponse = await response.json()
  return parseEmailResponse(email)
}
