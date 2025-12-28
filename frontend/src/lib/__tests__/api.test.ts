/**
 * Unit tests for API client
 * Tests error handling, retry mechanisms, and request/response formatting
 */

import { api, ApiClientError } from '../api'
import { ProjectCreate, ProjectUpdate, HearingLogCreate, FlowNodeCreate, FlowNodeUpdate, FlowReorderRequest } from '@/types/api'

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('Request/Response Formatting', () => {
    it('should include correct headers in requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue([])
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await api.projects.getProjects()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      )
    })

    it('should properly serialize request body for POST requests', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1, name: 'Test Project', status: 'draft' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const projectData: ProjectCreate = { name: 'Test Project', department: 'IT' }
      await api.projects.createProject(projectData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(projectData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle non-JSON responses for DELETE operations', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'text/plain' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const result = await api.projects.deleteProject(1)

      expect(result).toEqual({})
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should parse JSON responses correctly', async () => {
      const mockData = [
        { id: 1, name: 'Project 1', status: 'draft', created_at: '2023-01-01', updated_at: '2023-01-01' },
        { id: 2, name: 'Project 2', status: 'draft', created_at: '2023-01-02', updated_at: '2023-01-02' }
      ]
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(mockData)
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const result = await api.projects.getProjects()

      expect(result).toEqual(mockData)
      expect(mockResponse.json).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle structured API errors', async () => {
      const errorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project name',
          details: { field: 'name' }
        }
      }
      const mockResponse = {
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(errorResponse)
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toBe('Loading projects: Invalid project name')
        expect((error as ApiClientError).status).toBe(400)
        expect((error as ApiClientError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiClientError).details).toEqual({ field: 'name' })
      }
    })

    it('should handle unstructured API errors', async () => {
      const errorResponse = { message: 'Server error occurred' }
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(errorResponse)
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toBe('Loading projects: Server error occurred')
        expect((error as ApiClientError).status).toBe(500)
      }
    })

    it('should handle non-JSON error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'text/plain' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toBe('Loading projects: The requested resource was not found.')
        expect((error as ApiClientError).status).toBe(404)
      }
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      
      try {
        await api.projects.getProjects()
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).message).toBe('Failed to fetch')
      }
    })
  })

  describe('Retry Mechanisms', () => {
    it('should retry on network errors', async () => {
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue([])
        } as any)

      const result = await api.projects.getProjects()

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual([])
    })

    it('should retry on 5xx server errors', async () => {
      // First call returns 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } })
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

    it('should not retry on 4xx client errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ error: { code: 'BAD_REQUEST', message: 'Bad request' } })
      } as any)

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should stop retrying after max attempts', async () => {
      // Mock 4 consecutive failures (initial + 3 retries)
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(api.projects.getProjects()).rejects.toThrow(ApiClientError)
      expect(mockFetch).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })
  })

  describe('Project API', () => {
    it('should call correct endpoint for getProjects', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue([])
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await api.projects.getProjects()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      )
    })

    it('should call correct endpoint for createProject', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1, name: 'Test', status: 'draft' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const projectData: ProjectCreate = { name: 'Test Project' }
      await api.projects.createProject(projectData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(projectData)
        })
      )
    })

    it('should call correct endpoint for updateProject', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1, name: 'Updated', status: 'draft' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const updateData: ProjectUpdate = { name: 'Updated Project' }
      await api.projects.updateProject(1, updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      )
    })

    it('should call correct endpoint for deleteProject', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'text/plain' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await api.projects.deleteProject(1)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  describe('Hearing API', () => {
    it('should call correct endpoint for getHearingLogs', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue([])
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await api.hearing.getHearingLogs(1)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/1/hearing',
        expect.any(Object)
      )
    })

    it('should call correct endpoint for addHearingLog', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1, content: 'Test content' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const hearingData: HearingLogCreate = { content: 'Test hearing content' }
      await api.hearing.addHearingLog(1, hearingData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/1/hearing',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(hearingData)
        })
      )
    })

    it('should call correct endpoint for updateHearingLog', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1, content: 'Updated content' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const updateData = { content: 'Updated hearing content' }
      await api.hearing.updateHearingLog(1, updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/hearing/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      )
    })
  })

  describe('Flow API', () => {
    it('should call correct endpoint for getFlowNodes', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue([])
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await api.flow.getFlowNodes(1)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/1/flow',
        expect.any(Object)
      )
    })

    it('should call correct endpoint for generateFlow', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue([])
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await api.flow.generateFlow(1)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/1/flow/generate',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    it('should call correct endpoint for updateFlowNode', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1, text: 'Updated text' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const updateData: FlowNodeUpdate = { text: 'Updated flow node text' }
      await api.flow.updateFlowNode(1, updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/flow/nodes/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      )
    })

    it('should call correct endpoint for addFlowNode', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1, text: 'New node' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const nodeData: FlowNodeCreate = { project_id: 1, text: 'New flow node', order: 0 }
      await api.flow.addFlowNode(nodeData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/flow/nodes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(nodeData)
        })
      )
    })

    it('should call correct endpoint for deleteFlowNode', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'text/plain' })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await api.flow.deleteFlowNode(1)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/flow/nodes/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should call correct endpoint for reorderFlowNodes', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue([])
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const reorderData: FlowReorderRequest = {
        node_orders: [{ id: 1, order: 1 }, { id: 2, order: 0 }]
      }
      await api.flow.reorderFlowNodes(1, reorderData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/1/flow/reorder',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(reorderData)
        })
      )
    })
  })
})