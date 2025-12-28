import '@testing-library/jest-dom'

// Mock fetch globally for tests
global.fetch = jest.fn()

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  jest.clearAllMocks()
})