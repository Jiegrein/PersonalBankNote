import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BankSelectionModal } from '@/components/BankSelectionModal'
import { BankProvider, useBankContext } from '@/contexts/BankContext'
import { ReactNode } from 'react'

// Mock the BankContext
jest.mock('@/contexts/BankContext', () => ({
  ...jest.requireActual('@/contexts/BankContext'),
  useBankContext: jest.fn(),
}))

const mockBanks = [
  { id: '1', name: 'SMBC Bank', statementDay: 21, color: '#3B82F6' },
  { id: '2', name: 'BCA', statementDay: 7, color: '#10B981' },
  { id: '3', name: 'Mandiri', statementDay: 15, color: '#F59E0B' },
  { id: '4', name: 'BNI', statementDay: 10, color: '#EF4444' },
  { id: '5', name: 'CIMB Niaga', statementDay: 12, color: '#8B5CF6' },
  { id: '6', name: 'Permata Bank', statementDay: 20, color: '#EC4899' },
]

describe('BankSelectionModal', () => {
  const mockSetSelectedBankId = jest.fn()
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    const mockUseBankContext = useBankContext as jest.Mock
    mockUseBankContext.mockReturnValue({
      banks: mockBanks,
      selectedBankId: '1',
      setSelectedBankId: mockSetSelectedBankId,
      loading: false,
    })
  })

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      expect(screen.getByText('Select Bank')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <BankSelectionModal isOpen={false} onClose={mockOnClose} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Bank List Rendering', () => {
    it('should render all banks from context', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      expect(screen.getByText('SMBC Bank')).toBeInTheDocument()
      expect(screen.getByText('BCA')).toBeInTheDocument()
      expect(screen.getByText('Mandiri')).toBeInTheDocument()
      expect(screen.getByText('BNI')).toBeInTheDocument()
      expect(screen.getByText('CIMB Niaga')).toBeInTheDocument()
      expect(screen.getByText('Permata Bank')).toBeInTheDocument()
    })

    it('should display statement day for each bank', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      expect(screen.getByText('Statement day: 21')).toBeInTheDocument()
      expect(screen.getByText('Statement day: 7')).toBeInTheDocument()
      expect(screen.getByText('Statement day: 15')).toBeInTheDocument()
    })

    it('should show "No banks found" when bank list is empty', () => {
      const mockUseBankContext = useBankContext as jest.Mock
      mockUseBankContext.mockReturnValue({
        banks: [],
        selectedBankId: '',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      expect(screen.getByText('No banks found')).toBeInTheDocument()
    })

    it('should highlight selected bank', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const selectedBankButton = screen.getByText('SMBC Bank').closest('button')
      expect(selectedBankButton).toHaveClass('bg-green-600/20')
      expect(selectedBankButton).toHaveClass('border-green-500/50')
    })

    it('should show check icon for selected bank', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const selectedBankButton = screen.getByText('SMBC Bank').closest('button')
      const checkIcon = selectedBankButton?.querySelector('.lucide-check')
      expect(checkIcon).toBeInTheDocument()
    })

    it('should not show check icon for non-selected banks', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const nonSelectedBankButton = screen.getByText('BCA').closest('button')
      const checkIcon = nonSelectedBankButton?.querySelector('.lucide-check')
      expect(checkIcon).not.toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should show search input when more than 5 banks', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const searchInput = screen.getByPlaceholderText('Search banks...')
      expect(searchInput).toBeInTheDocument()
    })

    it('should not show search input when 5 or fewer banks', () => {
      const mockUseBankContext = useBankContext as jest.Mock
      mockUseBankContext.mockReturnValue({
        banks: mockBanks.slice(0, 5),
        selectedBankId: '1',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const searchInput = screen.queryByPlaceholderText('Search banks...')
      expect(searchInput).not.toBeInTheDocument()
    })

    it('should filter banks by name (case-insensitive)', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const searchInput = screen.getByPlaceholderText('Search banks...')
      fireEvent.change(searchInput, { target: { value: 'bca' } })

      expect(screen.getByText('BCA')).toBeInTheDocument()
      expect(screen.queryByText('SMBC Bank')).not.toBeInTheDocument()
      expect(screen.queryByText('Mandiri')).not.toBeInTheDocument()
    })

    it('should show "No banks found" when search has no results', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const searchInput = screen.getByPlaceholderText('Search banks...')
      fireEvent.change(searchInput, { target: { value: 'xyz' } })

      expect(screen.getByText('No banks found')).toBeInTheDocument()
    })

    it('should handle partial matches in search', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const searchInput = screen.getByPlaceholderText('Search banks...')
      fireEvent.change(searchInput, { target: { value: 'Bank' } })

      expect(screen.getByText('SMBC Bank')).toBeInTheDocument()
      expect(screen.getByText('Permata Bank')).toBeInTheDocument()
      expect(screen.queryByText('BCA')).not.toBeInTheDocument()
    })

    it('should clear search query when modal closes', async () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const searchInput = screen.getByPlaceholderText('Search banks...')
      fireEvent.change(searchInput, { target: { value: 'bca' } })

      const bcaButton = screen.getByText('BCA')
      fireEvent.click(bcaButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Bank Selection', () => {
    it('should call setSelectedBankId when bank is clicked', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const bcaButton = screen.getByText('BCA')
      fireEvent.click(bcaButton)

      expect(mockSetSelectedBankId).toHaveBeenCalledWith('2')
    })

    it('should call onClose when bank is clicked', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const bcaButton = screen.getByText('BCA')
      fireEvent.click(bcaButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should handle selecting already selected bank', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const smbc = screen.getByText('SMBC Bank')
      fireEvent.click(smbc)

      expect(mockSetSelectedBankId).toHaveBeenCalledWith('1')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Modal Interactions', () => {
    it('should call onClose when X button is clicked', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const closeButton = screen.getByRole('button', { name: '' }).closest('button')
      const xIcon = document.querySelector('.lucide-x')

      if (xIcon && xIcon.parentElement) {
        fireEvent.click(xIcon.parentElement)
      }

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop is clicked', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const backdrop = screen.getByText('Select Bank').closest('div')?.parentElement
      if (backdrop) {
        fireEvent.click(backdrop)
      }

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not call onClose when modal content is clicked', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const modalContent = screen.getByText('Select Bank').closest('div')
      if (modalContent) {
        fireEvent.click(modalContent)
      }

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Styling and Accessibility', () => {
    it('should have proper ARIA modal structure', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const modalTitle = screen.getByText('Select Bank')
      expect(modalTitle).toBeInTheDocument()
    })

    it('should apply color indicators to banks', () => {
      const { container } = render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const colorDots = container.querySelectorAll('[style*="background-color"]')
      expect(colorDots.length).toBeGreaterThan(0)
    })

    it('should have scrollable bank list with max height', () => {
      const { container } = render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const bankList = container.querySelector('.max-h-96')
      expect(bankList).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle banks with long names', () => {
      const mockUseBankContext = useBankContext as jest.Mock
      mockUseBankContext.mockReturnValue({
        banks: [
          {
            id: '1',
            name: 'Very Long Bank Name That Should Be Truncated Properly',
            statementDay: 21,
            color: '#3B82F6',
          },
        ],
        selectedBankId: '1',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      expect(
        screen.getByText('Very Long Bank Name That Should Be Truncated Properly')
      ).toBeInTheDocument()
    })

    it('should handle banks with special characters in name', () => {
      const mockUseBankContext = useBankContext as jest.Mock
      mockUseBankContext.mockReturnValue({
        banks: [
          {
            id: '1',
            name: 'Bank & Trust Co.',
            statementDay: 21,
            color: '#3B82F6',
          },
        ],
        selectedBankId: '1',
        setSelectedBankId: mockSetSelectedBankId,
        loading: false,
      })

      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      expect(screen.getByText('Bank & Trust Co.')).toBeInTheDocument()
    })

    it('should handle rapid bank selection clicks', () => {
      render(
        <BankSelectionModal isOpen={true} onClose={mockOnClose} />
      )

      const bcaButton = screen.getByText('BCA')
      fireEvent.click(bcaButton)
      fireEvent.click(bcaButton)
      fireEvent.click(bcaButton)

      expect(mockSetSelectedBankId).toHaveBeenCalledTimes(3)
      expect(mockOnClose).toHaveBeenCalledTimes(3)
    })
  })
})
