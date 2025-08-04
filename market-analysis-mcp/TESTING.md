# Testing Infrastructure Documentation

## Overview

This document describes the comprehensive testing and CI/CD infrastructure for the Market Analysis MCP project. The testing setup ensures high code quality, reliability, and maintainability through automated testing, quality checks, and continuous integration.

## Test Structure

### Directory Organization

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── services/
│   │   └── relevanceScorer.test.ts  # Tests for relevance scoring algorithms
│   └── utils/
│       └── ToolFormatter.test.ts    # Tests for formatting utilities
├── integration/             # Integration tests for component interactions
│   └── mcp-tools.test.ts   # End-to-end MCP tool functionality tests
├── mocks/                   # Mock implementations for testing
│   └── mockServices.ts     # Mock services for external dependencies
└── fixtures/                # Test data and configurations
    ├── testData.ts         # Sample market data for testing
    └── test-config.json    # Test configuration files
```

## Test Coverage Results

### Core Components Coverage

| Component | Statement Coverage | Branch Coverage | Function Coverage | Lines Coverage |
|-----------|-------------------|-----------------|-------------------|----------------|
| **relevanceScorer.ts** | **90.42%** ✅ | **70%** ✅ | **100%** ✅ | **100%** ✅ |
| **ToolFormatter.ts** | **99.15%** ✅ | **85.39%** ✅ | **100%** ✅ | **98.98%** ✅ |

Both core utilities exceed the target 70% coverage requirement.

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions and methods in isolation

**Location**: `tests/unit/`

**Coverage Focus**:
- Business logic validation
- Edge case handling
- Input validation
- Error handling
- Performance characteristics

**Key Test Suites**:

#### RelevanceScorer Tests
- Market keyword detection and scoring
- Stock symbol recognition and filtering
- Source authority calculation
- Recency scoring with time decay
- Sentiment analysis
- Configuration handling
- Error recovery

#### ToolFormatter Tests
- Markdown formatting consistency
- Data visualization formatting
- Time formatting and display
- Content truncation logic
- Error message formatting
- Metric calculation and display

### 2. Integration Tests

**Purpose**: Test component interactions and data flow

**Location**: `tests/integration/`

**Coverage Focus**:
- MCP tool functionality end-to-end
- Service layer integration
- Data persistence and retrieval
- External API mocking
- Cross-component communication

**Key Test Areas**:
- News tool integration with services
- Search functionality with cache
- Unified tool data aggregation
- Error propagation and handling
- Performance under load

### 3. Mock Services

**Purpose**: Isolated testing without external dependencies

**Components**:
- MockNewsService
- MockPodcastService  
- MockGmailService
- MockCacheManager
- MockRateLimiter
- MockLogger

**Features**:
- Configurable success/failure scenarios
- Realistic data simulation
- Performance testing support
- Error injection capabilities

## Test Execution

### Available Test Scripts

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch

# CI-optimized testing
npm run test:ci
```

### Coverage Requirements

- **Minimum Coverage Target**: 70% for statements, branches, functions, and lines
- **Current Achievement**: Core utilities exceed 90% coverage
- **Coverage Reporting**: HTML, LCOV, and text formats
- **Coverage Enforcement**: Configured in Jest with automatic CI failure on threshold miss

## Continuous Integration Pipeline

### GitHub Actions Workflow

The CI/CD pipeline includes multiple parallel and sequential jobs:

#### 1. Code Quality Checks
- **ESLint**: Code style and best practices
- **Prettier**: Code formatting consistency
- **TypeScript**: Type checking and compilation

#### 2. Testing Matrix
- **Node.js Versions**: 18, 20
- **Test Types**: Unit, Integration, Coverage
- **Operating System**: Ubuntu (Linux)
- **Timeout**: 15 minutes maximum

#### 3. Security Scanning
- **npm audit**: Vulnerability detection
- **Snyk**: Security analysis (production only)
- **Dependency checking**: Outdated package detection

#### 4. Build Verification
- **TypeScript compilation**: Build success validation
- **Artifact generation**: Distribution files creation
- **Build artifact verification**: File existence and integrity

#### 5. Docker Integration
- **Multi-stage builds**: Optimized image creation
- **Image testing**: Container functionality validation
- **Registry publishing**: Automated image deployment

#### 6. Performance Testing
- **Load testing**: Concurrent request handling
- **Memory profiling**: Resource usage analysis
- **Benchmark comparison**: Performance regression detection

#### 7. End-to-End Testing
- **Full system integration**: Complete workflow validation
- **Real service simulation**: External dependency mocking
- **User scenario testing**: Realistic usage patterns

### Deployment Environments

#### Staging Deployment
- **Trigger**: Push to `develop` branch
- **Environment**: https://market-analysis-mcp.staging.com
- **Testing**: Automated staging verification
- **Purpose**: Pre-production validation

#### Production Deployment
- **Trigger**: Push to `main` branch
- **Requirements**: All CI stages must pass
- **Environment**: https://market-analysis-mcp.production.com
- **Testing**: Smoke tests and health checks
- **Rollback**: Automated rollback on failure

## Testing Best Practices

### 1. Test Organization
- **Descriptive test names**: Clear intent and expected behavior
- **Grouped test suites**: Logical component organization
- **Setup and teardown**: Proper test isolation
- **Mock management**: Controlled external dependencies

### 2. Coverage Strategy
- **Focus on business logic**: High-value code coverage
- **Edge case testing**: Boundary condition validation
- **Error path coverage**: Exception handling verification
- **Integration points**: Component interaction testing

### 3. Performance Considerations
- **Test execution time**: Under 15 seconds per suite
- **Parallel execution**: Independent test running
- **Resource cleanup**: Memory leak prevention
- **CI optimization**: Fast feedback loops

### 4. Data Management
- **Realistic test data**: Production-like scenarios
- **Data isolation**: Test independence
- **Dynamic generation**: Flexible test data creation
- **Cleanup procedures**: Test environment reset

## Quality Gates

### Pre-commit Hooks
- **Linting**: Automatic code style fixes
- **Type checking**: TypeScript validation
- **Test execution**: Failing tests block commits
- **Coverage validation**: Minimum coverage enforcement

### Pull Request Checks
- **All CI stages**: Must pass before merge
- **Code review**: Required reviewer approval
- **Coverage reports**: Automatic PR comments
- **Security scanning**: Vulnerability detection

### Deployment Criteria
- **Test success**: 100% test pass rate
- **Coverage maintenance**: No coverage reduction
- **Security clearance**: No high/critical vulnerabilities
- **Performance benchmarks**: No significant regression

## Troubleshooting

### Common Issues

#### Test Failures
1. **Check test logs**: Review detailed error messages
2. **Verify dependencies**: Ensure all packages installed
3. **Database state**: Reset test database if needed
4. **Mock configuration**: Validate mock service setup

#### Coverage Issues
1. **Review coverage report**: Identify uncovered lines
2. **Add missing tests**: Focus on untested branches
3. **Refactor if needed**: Simplify complex code paths
4. **Update thresholds**: Adjust if architecture changes

#### CI/CD Problems
1. **Check GitHub Actions**: Review workflow logs
2. **Environment variables**: Verify secret configuration
3. **Permission issues**: Check repository settings
4. **Resource limits**: Monitor CI resource usage

### Getting Help

- **Documentation**: Refer to this guide and inline comments
- **Test examples**: Review existing test files for patterns
- **CI logs**: Check GitHub Actions for detailed error information
- **Local debugging**: Use `npm run test:watch` for interactive testing

## Future Enhancements

### Planned Improvements
1. **Visual regression testing**: UI component validation
2. **API contract testing**: Service interface verification
3. **Load testing automation**: Scalability validation
4. **A/B testing framework**: Feature experimentation
5. **Accessibility testing**: WCAG compliance validation

### Metrics and Monitoring
1. **Test execution analytics**: Performance trending
2. **Coverage trend analysis**: Quality improvement tracking
3. **Flaky test detection**: Test reliability monitoring
4. **CI/CD pipeline optimization**: Build time improvement

---

**Last Updated**: August 2025  
**Maintained By**: Testing & DevOps Team  
**Review Cycle**: Monthly