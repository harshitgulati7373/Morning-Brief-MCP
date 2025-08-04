// Jest setup file for global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  // Uncomment to silence console.log in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test setup
beforeAll(() => {
  // Any global setup needed before all tests
});

// Global test teardown
afterAll(() => {
  // Any global cleanup needed after all tests
});