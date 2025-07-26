import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConnectAccountModal from '../ConnectAccountModal'

// Mock fetch globally
global.fetch = vi.fn()

describe('ConnectAccountModal', () => {
  const mockOnClose = vi.fn()
  const mockOnComplete = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage
    localStorage.getItem = vi.fn().mockReturnValue('test-token')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders initial state correctly', () => {
    render(
      <ConnectAccountModal
        visible={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    expect(screen.getByText('Conecta tu cuenta bancaria')).toBeInTheDocument()
    expect(screen.getByText('Conectar con BBVA')).toBeInTheDocument()
    expect(screen.getByText('Conexión segura')).toBeInTheDocument()
  })

  it('starts connection process when clicking connect button', async () => {
    const mockRequisitionResponse = {
      success: true,
      data: {
        requisitionId: 'test-requisition-id',
        consentUrl: 'https://bbva.example.com/auth'
      }
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRequisitionResponse
    })

    render(
      <ConnectAccountModal
        visible={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    const connectButton = screen.getByText('Conectar con BBVA')
    await userEvent.click(connectButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/financial/setup-bbva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      })
    })

    // Should move to authorization step
    expect(screen.getByText('Autoriza el acceso en BBVA')).toBeInTheDocument()
    expect(screen.getByText('He autorizado el acceso')).toBeInTheDocument()
    
    // Should open consent URL
    expect(window.open).toHaveBeenCalledWith('https://bbva.example.com/auth', '_blank')
  })

  it('handles authorization check correctly when status is LN', async () => {
    // First, setup the initial connection
    const mockRequisitionResponse = {
      success: true,
      data: {
        requisitionId: 'test-requisition-id',
        consentUrl: 'https://bbva.example.com/auth'
      }
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRequisitionResponse
    })

    render(
      <ConnectAccountModal
        visible={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    // Start connection
    const connectButton = screen.getByText('Conectar con BBVA')
    await userEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText('He autorizado el acceso')).toBeInTheDocument()
    })

    // Mock the status check response - THIS IS THE KEY FIX
    // The API returns data.data.status, not data.requisition.status
    const mockStatusResponse = {
      success: true,
      data: {
        requisitionId: 'test-requisition-id',
        status: 'LN',  // This is the correct path: data.data.status
        consentGiven: true,
        accounts: ['account1', 'account2'],
        accountsCount: 2,
        statusDetails: {
          isLinked: true
        }
      },
      message: 'Requisition is linked and ready for use'
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatusResponse
    })

    // Mock the complete setup response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    // Click the authorization button
    const authButton = screen.getByText('He autorizado el acceso')
    await userEvent.click(authButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/financial/requisition-status/test-requisition-id',
        {
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      )
    })

    // Should move to configuration step
    await waitFor(() => {
      expect(screen.getByText('Configurando tu cuenta...')).toBeInTheDocument()
    })

    // Should call complete setup
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/financial/complete-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          requisitionId: 'test-requisition-id',
        }),
      })
    })

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('¡Cuenta conectada exitosamente!')).toBeInTheDocument()
    })

    // Should call onComplete after delay
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('shows error when authorization is not complete', async () => {
    // Setup initial connection
    const mockRequisitionResponse = {
      success: true,
      data: {
        requisitionId: 'test-requisition-id',
        consentUrl: 'https://bbva.example.com/auth'
      }
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRequisitionResponse
    })

    render(
      <ConnectAccountModal
        visible={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    const connectButton = screen.getByText('Conectar con BBVA')
    await userEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText('He autorizado el acceso')).toBeInTheDocument()
    })

    // Mock status response with non-linked status
    const mockStatusResponse = {
      success: true,
      data: {
        requisitionId: 'test-requisition-id',
        status: 'GC', // Giving Consent - not yet linked
        consentGiven: false,
        statusDetails: {
          isGivingConsent: true,
          isLinked: false
        }
      },
      message: 'User is currently giving consent'
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatusResponse
    })

    const authButton = screen.getByText('He autorizado el acceso')
    await userEvent.click(authButton)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/La autorización aún no se ha completado/)).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    render(
      <ConnectAccountModal
        visible={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    const connectButton = screen.getByText('Conectar con BBVA')
    await userEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText('No se pudo iniciar la conexión. Por favor, inténtalo de nuevo.')).toBeInTheDocument()
    })
  })

  it('closes modal when clicking cancel', async () => {
    const mockRequisitionResponse = {
      success: true,
      data: {
        requisitionId: 'test-requisition-id',
        consentUrl: 'https://bbva.example.com/auth'
      }
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRequisitionResponse
    })

    render(
      <ConnectAccountModal
        visible={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    const connectButton = screen.getByText('Conectar con BBVA')
    await userEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    const cancelButton = screen.getByText('Cancelar')
    await userEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('handles LINKED status (alternative to LN)', async () => {
    // Setup initial connection
    const mockRequisitionResponse = {
      success: true,
      data: {
        requisitionId: 'test-requisition-id',
        consentUrl: 'https://bbva.example.com/auth'
      }
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRequisitionResponse
    })

    render(
      <ConnectAccountModal
        visible={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    const connectButton = screen.getByText('Conectar con BBVA')
    await userEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText('He autorizado el acceso')).toBeInTheDocument()
    })

    // Mock status response with LINKED status (some banks use this instead of LN)
    const mockStatusResponse = {
      success: true,
      data: {
        requisitionId: 'test-requisition-id',
        status: 'LINKED', // Alternative status
        consentGiven: true,
        accounts: ['account1'],
        accountsCount: 1
      }
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatusResponse
    })

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    const authButton = screen.getByText('He autorizado el acceso')
    await userEvent.click(authButton)

    // Should proceed to configuration
    await waitFor(() => {
      expect(screen.getByText('Configurando tu cuenta...')).toBeInTheDocument()
    })
  })
})