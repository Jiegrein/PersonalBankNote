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

export function buildEmailFilterQuery(emailFilter: string, since?: Date): string {
  let filter = `from/emailAddress/address eq '${emailFilter}'`

  if (since) {
    const isoDate = since.toISOString()
    filter += ` and receivedDateTime ge ${isoDate}`
  }

  return filter
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
  top: number = 50
): Promise<EmailMessage[]> {
  const filter = buildEmailFilterQuery(emailFilter, since)

  const url = new URL(`${GRAPH_BASE_URL}/me/messages`)
  url.searchParams.set('$filter', filter)
  url.searchParams.set('$orderby', 'receivedDateTime desc')
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

  return emails.map(parseEmailResponse)
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
