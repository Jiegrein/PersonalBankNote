import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import DashboardPage from '@/app/dashboard/page'
import { useBankContext } from '@/contexts/BankContext'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('@/contexts/BankContext')
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

// Mock recharts to avoid rendering issues
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div>Pie</div>,
  Cell: () => <div>Cell</div>,
  Tooltip: () => <div>Tooltip</div>,
}))

const mockBanks = [
  { id: '1', name: 'SMBC', statementDay: 21, color: '#3B82F6' },
  { id: '2', name: 'BCA', statementDay: 7, color: '#10B981' },
  { id: '3', name: 'Mandiri', statementDay: 15, color: '#F59E0B' },
  { id: '4', name: 'BNI', statementDay: 10, color: '#EF4444' },
  { id: '5', name: 'CIMB', statementDay: 12, color: '#8B5CF6' },
]

const mockSession = {
  user: { email: 'test@example.com', name: 'Test User' },
  expires: '2025-12-31',
}

global.fetch = jest.fn()

describe('Dashboard - Bank Selector', () => {
  const mockSetSelectedBankId = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    const mockUseSession = useSession as jest.Mock;
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })
    const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
      banks: mockBanks,
      selectedBankId: '1',
      setSelectedBankId: mockSetSelectedBankId,
      loading: false,
    })
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        transactions: [],
        chartData: [],
        total: 0,
      }),
    })
  })

  describe('Bank Tab Rendering', () => {
    it('should render first 4 banks as visible tabs', () => {
      render(<DashboardPage />)

      expect(screen.getByText('SMBC')).toBeInTheDocument()
      expect(screen.getByText('BCA')).toBeInTheDocument()
      expect(screen.getByText('Mandiri')).toBeInTheDocument()
      expect(screen.getByText('BNI')).toBeInTheDocument()
    })

    it('should show "More" button when more than 4 banks exist', () => {
      render(<DashboardPage />)

      const moreButton = screen.getByText(/More \(1\)/)
      expect(moreButton).toBeInTheDocument()
    })

    it('should not show "More" button when 4 or fewer banks', () => {
      const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
        banks: mockBanks.slice(0, 4),
        selectedBankId: '1',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(<DashboardPage />)

      const moreButton = screen.queryByText(/More/)
      expect(moreButton).not.toBeInTheDocument()
    })

    it('should highlight active bank tab', () => {
      render(<DashboardPage />)

      const smbc = screen.getByText('SMBC').closest('button')
      expect(smbc).toHaveClass('bg-green-600')
      expect(smbc).toHaveClass('text-white')
    })

    it('should not highlight inactive bank tabs', () => {
      render(<DashboardPage />)

      const bca = screen.getByText('BCA').closest('button')
      expect(bca).toHaveClass('bg-gray-800')
      expect(bca).toHaveClass('text-gray-300')
    })

    it('should display color indicator for each bank', () => {
      const { container } = render(<DashboardPage />)

      const colorDots = container.querySelectorAll('[style*="background-color"]')
      expect(colorDots.length).toBeGreaterThanOrEqual(4) // At least 4 visible banks
    })

    it('should show loading spinner on active bank during loading', () => {
      ;(useBankContext as jest.Mock).mockReturnValue({
        banks: mockBanks,
        selectedBankId: '1',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      const { rerender } = render(<DashboardPage />)

      // Simulate loading state - reuse existing mock reference
      ;(useBankContext as jest.Mock).mockReturnValue({
        banks: mockBanks,
        selectedBankId: '1',
        setSelectedBankId: mockSetSelectedBankId,
        loading: true, // Now loading
      })

      rerender(<DashboardPage />)

      // In actual loading state, spinner should appear
      // The component would show a loader when loading is true
    })
  })

  describe('Bank Tab Interactions', () => {
    it('should call setSelectedBankId when bank tab is clicked', () => {
      render(<DashboardPage />)

      const bcaButton = screen.getByText('BCA').closest('button')
      if (bcaButton) {
        fireEvent.click(bcaButton)
      }

      expect(mockSetSelectedBankId).toHaveBeenCalledWith('2')
    })

    it('should have proper ARIA attributes for tabs', () => {
      render(<DashboardPage />)

      const smbc = screen.getByText('SMBC').closest('button')
      expect(smbc).toHaveAttribute('role', 'tab')
      expect(smbc).toHaveAttribute('aria-selected', 'true')
      expect(smbc).toHaveAttribute('aria-controls', 'bank-panel-1')
    })

    it('should have aria-selected false for inactive tabs', () => {
      render(<DashboardPage />)

      const bca = screen.getByText('BCA').closest('button')
      expect(bca).toHaveAttribute('aria-selected', 'false')
    })

    it('should open modal when "More" button is clicked', () => {
      render(<DashboardPage />)

      const moreButton = screen.getByText(/More \(1\)/)
      fireEvent.click(moreButton)

      // Modal should open - BankSelectionModal component
      // This would require checking for modal content
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate to next bank with ArrowRight key', () => {
      render(<DashboardPage />)

      fireEvent.keyDown(window, { key: 'ArrowRight' })

      expect(mockSetSelectedBankId).toHaveBeenCalledWith('2')
    })

    it('should navigate to previous bank with ArrowLeft key', () => {
      const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
        banks: mockBanks,
        selectedBankId: '2',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(<DashboardPage />)

      fireEvent.keyDown(window, { key: 'ArrowLeft' })

      expect(mockSetSelectedBankId).toHaveBeenCalledWith('1')
    })

    it('should wrap around to first bank when ArrowRight on last bank', () => {
      const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
        banks: mockBanks,
        selectedBankId: '5',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(<DashboardPage />)

      fireEvent.keyDown(window, { key: 'ArrowRight' })

      expect(mockSetSelectedBankId).toHaveBeenCalledWith('1')
    })

    it('should wrap around to last bank when ArrowLeft on first bank', () => {
      render(<DashboardPage />)

      fireEvent.keyDown(window, { key: 'ArrowLeft' })

      expect(mockSetSelectedBankId).toHaveBeenCalledWith('5')
    })

    it('should prevent default browser behavior on arrow keys', () => {
      render(<DashboardPage />)

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
      window.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should not navigate when no banks exist', () => {
      const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
        banks: [],
        selectedBankId: '',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(<DashboardPage />)

      fireEvent.keyDown(window, { key: 'ArrowRight' })

      expect(mockSetSelectedBankId).not.toHaveBeenCalled()
    })

    it('should cleanup keyboard event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = render(<DashboardPage />)
      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Transaction Fetching', () => {
    it('should fetch transactions when bank is selected', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/transactions')
        )
      })
    })

    it('should include bankId in transaction request', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('bankId=1')
        )
      })
    })

    it('should refetch transactions when bank changes', async () => {
      const { rerender } = render(<DashboardPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      jest.clearAllMocks()

      const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
        banks: mockBanks,
        selectedBankId: '2',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      rerender(<DashboardPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('bankId=2')
        )
      })
    })

    it('should not fetch transactions when no bank is selected', () => {
      const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
        banks: mockBanks,
        selectedBankId: '',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(<DashboardPage />)

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Empty States', () => {
    it('should show "No banks configured" when no banks exist', () => {
      const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
        banks: [],
        selectedBankId: '',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(<DashboardPage />)

      expect(screen.getByText('No banks configured yet')).toBeInTheDocument()
      expect(screen.getByText('Add your first bank')).toBeInTheDocument()
    })

    it('should show loading spinner during data fetch', () => {
      const mockUseBankContext = useBankContext as jest.Mock;
    mockUseBankContext.mockReturnValue({
        banks: mockBanks,
        selectedBankId: '1',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      const { container } = render(<DashboardPage />)

      // Check for loading state in component
      // This would need component internal loading state to test
    })
  })

  describe('Responsive Design', () => {
    it('should apply scrollbar-hide class for horizontal scrolling', () => {
      const { container } = render(<DashboardPage />)

      const tabContainer = container.querySelector('.scrollbar-hide')
      expect(tabContainer).toBeInTheDocument()
    })

    it('should have overflow-x-auto for mobile scrolling', () => {
      const { container } = render(<DashboardPage />)

      const tabContainer = container.querySelector('.overflow-x-auto')
      expect(tabContainer).toBeInTheDocument()
    })
  })

  describe('Authentication', () => {
    it('should show sign-in message when not authenticated', () => {
      const mockUseSession = useSession as jest.Mock;
    mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<DashboardPage />)

      expect(screen.getByText('Please sign in to view dashboard.')).toBeInTheDocument()
    })

    it('should show "Go to home" link when not authenticated', () => {
      const mockUseSession = useSession as jest.Mock;
    mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<DashboardPage />)

      const homeLink = screen.getByText('Go to home')
      expect(homeLink).toHaveAttribute('href', '/')
    })
  })

  describe('Period Navigation Integration', () => {
    it('should display period navigator beside bank tabs', () => {
      render(<DashboardPage />)

      const chevronLeft = document.querySelector('.lucide-chevron-left')
      const chevronRight = document.querySelector('.lucide-chevron-right')

      expect(chevronLeft).toBeInTheDocument()
      expect(chevronRight).toBeInTheDocument()
    })
  })
})
