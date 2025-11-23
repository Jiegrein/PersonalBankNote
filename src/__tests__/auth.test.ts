import { authOptions } from '@/lib/auth'

describe('Auth Configuration', () => {
  it('should have Azure AD provider configured', () => {
    const azureProvider = authOptions.providers.find(
      (p) => p.id === 'azure-ad'
    )
    expect(azureProvider).toBeDefined()
  })

  it('should request Mail.Read scope', () => {
    const azureProvider = authOptions.providers.find(
      (p) => p.id === 'azure-ad'
    ) as any

    expect(azureProvider.options.authorization.params.scope).toContain('Mail.Read')
  })

  it('should have jwt callback that stores access token', () => {
    expect(authOptions.callbacks?.jwt).toBeDefined()
  })

  it('should have session callback that exposes access token', () => {
    expect(authOptions.callbacks?.session).toBeDefined()
  })
})
