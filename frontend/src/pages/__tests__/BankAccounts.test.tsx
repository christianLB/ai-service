import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import BankAccounts from '../BankAccounts'
import * as api from '../../services/api'

// Mock the API module
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  }
}))

// Mock the socket module
vi.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({
    subscribe: vi.fn().mockReturnValue(() => {}),
  })
}))

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  }
})

// Import mocked message after mock setup
import { message } from 'antd'

describe('BankAccounts - Scheduler Functionality', () => {
  let queryClient: QueryClient
  const mockApi = api.default as any

  const renderComponent = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <BankAccounts />
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock localStorage
    localStorage.getItem = vi.fn().mockReturnValue('test-token')
    
    // Default API responses
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/financial/accounts') {
        return Promise.resolve({
          data: {
            success: true,
            data: []
          }
        })
      }
      if (url === '/financial/sync-status') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              scheduler: {
                isRunning: false,
                interval: 3600000
              }
            }
          }
        })
      }
      if (url === '/financial/rate-limits') {
        return Promise.resolve({
          data: {
            success: true,
            data: []
          }
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Scheduler Start/Stop Endpoints', () => {
    it('should call the correct endpoint to start scheduler', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } })
      
      renderComponent()
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })

      // Find and click the auto-sync toggle (when it's off, clicking starts it)
      const toggleButton = await screen.findByLabelText(/sincronización automática/i)
      expect(toggleButton).toBeInTheDocument()
      
      await userEvent.click(toggleButton)

      // Verify correct endpoint was called
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/financial/scheduler/start')
      })
      
      // Verify success message
      expect(message.success).toHaveBeenCalledWith('Sincronización automática activada')
    })

    it('should call the correct endpoint to stop scheduler', async () => {
      // Set initial state with scheduler running
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/financial/accounts') {
          return Promise.resolve({ data: { success: true, data: [] } })
        }
        if (url === '/financial/sync-status') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                scheduler: {
                  isRunning: true, // Scheduler is running
                  interval: 3600000
                }
              }
            }
          })
        }
        if (url === '/financial/rate-limits') {
          return Promise.resolve({ data: { success: true, data: [] } })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      mockApi.post.mockResolvedValueOnce({ data: { success: true } })
      
      renderComponent()
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })

      // Find and click the auto-sync toggle (when it's on, clicking stops it)
      const toggleButton = await screen.findByLabelText(/sincronización automática/i)
      await userEvent.click(toggleButton)

      // Verify correct endpoint was called
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/financial/scheduler/stop')
      })
      
      // Verify success message
      expect(message.success).toHaveBeenCalledWith('Sincronización automática desactivada')
    })

    it('should handle scheduler start errors gracefully', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Failed to start scheduler'))
      
      renderComponent()
      
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })

      const toggleButton = await screen.findByLabelText(/sincronización automática/i)
      await userEvent.click(toggleButton)

      // Verify error handling
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/financial/scheduler/start')
        expect(message.error).toHaveBeenCalledWith('Error al cambiar el estado de la sincronización automática')
      })
    })

    it('should handle scheduler stop errors gracefully', async () => {
      // Set scheduler as running
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/financial/sync-status') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                scheduler: {
                  isRunning: true,
                  interval: 3600000
                }
              }
            }
          })
        }
        return Promise.resolve({ data: { success: true, data: [] } })
      })
      
      mockApi.post.mockRejectedValueOnce(new Error('Failed to stop scheduler'))
      
      renderComponent()
      
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })

      const toggleButton = await screen.findByLabelText(/sincronización automática/i)
      await userEvent.click(toggleButton)

      // Verify error handling
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/financial/scheduler/stop')
        expect(message.error).toHaveBeenCalledWith('Error al cambiar el estado de la sincronización automática')
      })
    })

    it('should refresh sync status after toggling scheduler', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } })
      
      renderComponent()
      
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })

      // Clear previous calls
      mockApi.get.mockClear()

      const toggleButton = await screen.findByLabelText(/sincronización automática/i)
      await userEvent.click(toggleButton)

      // Verify sync status is refreshed after toggle
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })
    })

    it('should show loading state while toggling scheduler', async () => {
      // Add a delay to the API call to test loading state
      mockApi.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
      )
      
      renderComponent()
      
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })

      const toggleButton = await screen.findByLabelText(/sincronización automática/i)
      
      // Click and check for loading state
      await userEvent.click(toggleButton)
      
      // The switch should be disabled while loading
      expect(toggleButton).toBeDisabled()
      
      // Wait for operation to complete
      await waitFor(() => {
        expect(toggleButton).not.toBeDisabled()
      })
    })

    it('should handle network errors properly', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: 'Internal server error'
          }
        }
      })
      
      renderComponent()
      
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })

      const toggleButton = await screen.findByLabelText(/sincronización automática/i)
      await userEvent.click(toggleButton)

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Error al cambiar el estado de la sincronización automática')
      })
    })

    it('should use correct endpoints with /financial prefix', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      
      renderComponent()
      
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/financial/sync-status')
      })

      // Test start endpoint
      const toggleButton = await screen.findByLabelText(/sincronización automática/i)
      await userEvent.click(toggleButton)

      await waitFor(() => {
        // Should NOT call /scheduler/start (without prefix)
        expect(mockApi.post).not.toHaveBeenCalledWith('/scheduler/start')
        // Should call /financial/scheduler/start (with prefix)
        expect(mockApi.post).toHaveBeenCalledWith('/financial/scheduler/start')
      })

      // Reset and test stop endpoint
      mockApi.post.mockClear()
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/financial/sync-status') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                scheduler: {
                  isRunning: true,
                  interval: 3600000
                }
              }
            }
          })
        }
        return Promise.resolve({ data: { success: true, data: [] } })
      })

      // Click again to stop
      await userEvent.click(toggleButton)

      await waitFor(() => {
        // Should NOT call /scheduler/stop (without prefix)
        expect(mockApi.post).not.toHaveBeenCalledWith('/scheduler/stop')
        // Should call /financial/scheduler/stop (with prefix)
        expect(mockApi.post).toHaveBeenCalledWith('/financial/scheduler/stop')
      })
    })
  })
})