import { renderHook, waitFor } from '@testing-library/react'
import { BankProvider, useBankContext } from '@/contexts/BankContext'
import { ReactNode } from 'react'

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

interface Bank {
  id: string
  name: string
  statementDay: number
  color: string
}

const mockBanks: Bank[] = [
  { id: '1', name: 'SMBC', statementDay: 21, color: '#3B82F6' },
  { id: '2', name: 'BCA', statementDay: 7, color: '#10B981' },
  { id: '3', name: 'Mandiri', statementDay: 15, color: '#F59E0B' },
]

interface WrapperProps {
  children: ReactNode
}

describe('BankContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  function Wrapper({ children }: WrapperProps) {
    return <BankProvider>{children}</BankProvider>
  }

  describe('useBankContext hook', () => {
    it('should throw error when used outside BankProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useBankContext())
      }).toThrow('useBankContext must be used within a BankProvider')

      consoleSpy.mockRestore()
    })

    it('should provide context when used within BankProvider', () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      expect(result.current).toBeDefined()
      expect(result.current.banks).toEqual([])
      expect(result.current.selectedBankId).toBe('')
      expect(typeof result.current.setSelectedBankId).toBe('function')
    })
  })

  describe('BankProvider initialization', () => {
    it('should fetch banks on mount', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockBanks,
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/banks')
      })

      await waitFor(() => {
        expect(result.current.banks).toEqual(mockBanks)
        expect(result.current.loading).toBe(false)
      })
    })

    it('should set first bank as selected by default', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.selectedBankId).toBe('1')
      })
    })

    it('should handle empty bank list', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.banks).toEqual([])
        expect(result.current.selectedBankId).toBe('')
        expect(result.current.loading).toBe(false)
      })
    })

    it('should handle fetch error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.banks).toEqual([])
        expect(result.current.loading).toBe(false)
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch banks:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-array response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'Invalid response' }),
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.banks).toEqual([])
        expect(result.current.loading).toBe(false)
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle failed response status', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.banks).toEqual([])
        expect(result.current.loading).toBe(false)
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('setSelectedBankId', () => {
    it('should update selected bank id', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.selectedBankId).toBe('1')
      })

      result.current.setSelectedBankId('2')

      await waitFor(() => {
        expect(result.current.selectedBankId).toBe('2')
      })
    })

    it('should not re-fetch banks when changing selected bank', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockBanks,
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.banks).toEqual(mockBanks)
      })

      const fetchCallCount = mockFetch.mock.calls.length

      result.current.setSelectedBankId('2')

      await waitFor(() => {
        expect(result.current.selectedBankId).toBe('2')
      })

      // After fixing the useEffect dependency array, changing selectedBankId
      // should NOT trigger a re-fetch. The fetch count should remain the same.
      expect(mockFetch.mock.calls.length).toBe(fetchCallCount)
    })
  })

  describe('loading state', () => {
    it('should start with loading true', () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      expect(result.current.loading).toBe(true)
    })

    it('should set loading false after successful fetch', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should set loading false after failed fetch', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('bank data integrity', () => {
    it('should preserve bank properties', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.banks[0]).toEqual({
          id: '1',
          name: 'SMBC',
          statementDay: 21,
          color: '#3B82F6',
        })
      })
    })

    it('should maintain bank order from API', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      } as Response)

      const { result } = renderHook(() => useBankContext(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.banks[0].name).toBe('SMBC')
        expect(result.current.banks[1].name).toBe('BCA')
        expect(result.current.banks[2].name).toBe('Mandiri')
      })
    })
  })
})
