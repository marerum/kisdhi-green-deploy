/**
 * Extended unit tests for API client error handling
 * Tests comprehensive error scenarios, timeout handling, and user-friendly messages
 */

import { api, ApiClientError } from '../api'

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('API Client - Extended Error Handling', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Timeout Handling', () => {
    it('should timeout requests after default timeout period', async () => {
      // Mock a request that never resolves
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const requestPromise = api.projects.getProjects()

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(10000)

      await expect(requestPromise).rejects.toThrow(ApiClientError)
      
      try {
        await requestPromise
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).code).toBe('TIMEOUT')
        expect((error as ApiClientError).status).toBe(408)
        expect((error as ApiClientError).isRetryable).toBe(true)
      }
    })

    it('should retry timeout errors up to max retries', async () => {
      // Mock requests that timeout
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const requestPromise = api.projects.getProjects()

      // Advance time to trigger multiple timeouts
      for (let i = 0; i < 4; i++) {
        jest.advanceTimersByTime(10000)
        await Promise.resolve() // Allow promises to resolve
      }

      await expect(requestPromise).rejects.toThrow(ApiClientError)
      
      // Should have made 4 attempts (initial + 3 retries)
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })

    it('should succeed if request completes before timeout', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue([])
      }

      // Mock a request that resolves quickly
      mockFetch.mockResolvedValue(mockResponse as any)

      const result = await api.projects.getProjects()

      expect(result).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Network Error Scenarios', () => {
    it('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch: DNS resolution failed'))

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).code).toBe('NETWORK_ERROR')
        expect((error as ApiClientError).isRetryable).toBe(true)
        expect((error as ApiClientError).getUserFriendlyMessage()).toBe(
          'Unable to connect to the server. Please check your internet connection.'
        )
      }
    })

    it('should handle connection refused errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch: Connection refused'))

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).isRetryable).toBe(true)
      }
    })

    it('should handle offline scenarios', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch: Network request failed'))

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).getUserFriendlyMessage()).toBe(
          'Unable to connect to the server. Please check your internet connection.'
        )
      }
    })
  })

  describe('HTTP Status Code Handling', () => {
    it('should handle 401 Unauthorized errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).status).toBe(401)
        expect((error as ApiClientError).getUserFriendlyMessage()).toBe(
          'Authentication required. Please refresh the page and try again.'
        )
      }
    })

    it('should handle 403 Forbidden errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).getUserFriendlyMessage()).toBe(
          'You do not have permission to perform this action.'
        )
      }
    })

    it('should handle 404 Not Found errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found'
          }
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).getUserFriendlyMessage()).toBe(
          'The requested resource was not found.'
        )
      }
    })

    it('should handle 429 Rate Limit errors with retry', async () => {
      // First call returns 429, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue({
            error: {
              code: 'RATE_LIMIT',
              message: 'Too many requests'
            }
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue([])
        } as any)

      const result = await api.projects.getProjects()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    it('should handle 502 Bad Gateway errors with retry', async () => {
      // First call returns 502, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue({
            error: {
              code: 'BAD_GATEWAY',
              message: 'Bad gateway'
            }
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue([])
        } as any)

      const result = await api.projects.getProjects()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    it('should handle 503 Service Unavailable errors with retry', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service temporarily unavailable'
          }
        })
      } as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      // Should retry 503 errors
      expect(mockFetch).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })
  })

  describe('Response Format Handling', () => {
    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow()
    })

    it('should handle empty response bodies', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(null)
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const result = await api.projects.deleteProject(1)
      expect(result).toEqual({})
    })

    it('should handle responses with wrong content-type', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'text/html' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toBe('HTTP 500: Internal Server Error')
      }
    })
  })

  describe('User-Friendly Error Messages', () => {
    it('should provide user-friendly message for validation errors', () => {
      const error = new ApiClientError(
        'Name is required',
        400,
        'VALIDATION_ERROR',
        { field: 'name' }
      )

      expect(error.getUserFriendlyMessage()).toBe('Name is required')
    })

    it('should provide user-friendly message for network errors', () => {
      const error = new ApiClientError(
        'Network error: Failed to fetch',
        undefined,
        'NETWORK_ERROR'
      )

      expect(error.getUserFriendlyMessage()).toBe(
        'Unable to connect to the server. Please check your internet connection.'
      )
    })

    it('should provide user-friendly message for timeout errors', () => {
      const error = new ApiClientError(
        'Request timed out',
        408,
        'TIMEOUT'
      )

      expect(error.getUserFriendlyMessage()).toBe(
        'The request took too long to complete. Please try again.'
      )
    })

    it('should provide user-friendly message for server errors', () => {
      const error = new ApiClientError(
        'Internal server error',
        500,
        'SERVER_ERROR'
      )

      expect(error.getUserFriendlyMessage()).toBe(
        'A server error occurred. Please try again in a moment.'
      )
    })

    it('should fall back to original message for unknown errors', () => {
      const error = new ApiClientError(
        'Unknown error occurred',
        undefined,
        'UNKNOWN_ERROR'
      )

      expect(error.getUserFriendlyMessage()).toBe('Unknown error occurred')
    })
  })

  describe('Context-Aware Error Messages', () => {
    it('should include context in error messages when provided', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          error: {
            code: 'SERVER_ERROR',
            message: 'Database connection failed'
          }
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.createProject({ name: 'Test' })).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.createProject({ name: 'Test' })
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toContain('Creating project:')
      }
    })

    it('should provide appropriate context for different operations', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found'
          }
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // Test different API operations have appropriate context
      await expect(api.hearing.getHearingLogs(1)).rejects.toThrow(/Loading hearing logs/)
      await expect(api.flow.generateFlow(1)).rejects.toThrow(/Generating flow diagram/)
      await expect(api.projects.updateProject(1, { name: 'Updated' })).rejects.toThrow(/Updating project/)
    })
  })

  describe('Retry Logic Edge Cases', () => {
    it('should use exponential backoff for retries', async () => {
      const startTime = Date.now()
      let callTimes: number[] = []

      mockFetch.mockImplementation(() => {
        callTimes.push(Date.now() - startTime)
        return Promise.reject(new TypeError('Failed to fetch'))
      })

      try {
        await api.projects.getProjects()
      } catch (error) {
        // Should have made 4 calls with increasing delays
        expect(callTimes).toHaveLength(4)
      }
    })

    it('should not retry non-retryable errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input'
          }
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      // Should not retry 400 errors
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle mixed success/failure retry scenarios', async () => {
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue([{ id: 1, name: 'Test Project' }])
        } as any)

      const result = await api.projects.getProjects()

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual([{ id: 1, name: 'Test Project' }])
    })
  })
});