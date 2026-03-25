# Contributing to EpiCheck

Thank you for your interest in contributing to EpiCheck! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Strategy](#branch-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## Getting Started

### 1. Fork the Repository

Click the "Fork" button on the GitHub repository page to create your own copy.

### 2. Clone Your Fork

```bash
git clone git@github.com:YOUR_USERNAME/Epicheck.git
cd Epicheck
```

### 3. Add Upstream Remote

Keep your fork synced with the main repository:

```bash
git remote add upstream git@github.com:AlexandreDFM/Epicheck.git
git fetch upstream
```

### 4. Set Up Development Environment

Follow the [Git Setup Guide](./docs/GIT_SETUP.md) to configure Node.js, pnpm, and other dependencies.

```bash
# Install Node.js version from .nvmrc
nvm install && nvm use

# Enable corepack and install pnpm
corepack enable
corepack prepare pnpm@latest --activate

# Install dependencies
pnpm install
```

---

## Development Workflow

### 1. Keep Your Fork Updated

Before starting new work:

```bash
git fetch upstream
git rebase upstream/main
```

### 2. Create a Feature Branch

Create a branch from `main` following the naming convention:

```bash
# For features
git checkout -b feature/description-of-feature

# For bug fixes
git checkout -b fix/description-of-bug

# For chores/docs
git checkout -b chores/description-of-task
```

### 3. Make Your Changes

- Write clean, readable code
- Follow the [Coding Standards](#coding-standards)
- Make small, focused commits
- Test your changes thoroughly

### 4. Keep Your Branch Updated

If the upstream `main` branch is updated while you're working:

```bash
git fetch upstream
git rebase upstream/main
```

---

## Branch Strategy

We follow a simplified Git Flow:

- **`main`** - Stable, production-ready code
- **`develop`** - Development branch (if applicable)
- **Feature branches** - `feature/*`, `fix/*`, `chores/*`

Branch naming convention:
- `feature/user-authentication` - New feature
- `fix/login-button-crash` - Bug fix
- `chores/update-dependencies` - Maintenance tasks
- `docs/add-api-docs` - Documentation improvements

---

## Commit Guidelines

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding or updating tests
- **chore**: Changes to build process, dependencies, or tooling

### Scope

The scope specifies what part of the codebase is affected (e.g., `auth`, `ui`, `api`).

### Subject

- Use imperative mood ("add" not "added")
- Don't capitalize the first letter
- No period at the end
- Limit to 50 characters

### Body

- Optional but highly recommended
- Explain **what** and **why**, not **how**
- Wrap at 72 characters
- Separate from subject with a blank line

### Examples

```
feat(auth): implement Azure AD integration

Add support for Azure Active Directory authentication
using MSAL library. Includes token handling and
session management.

Closes #123
```

```
fix(ui): resolve button alignment on mobile

The submit button was overlapping input fields on
small screens due to incorrect flex layout.
```

---

## Pull Request Process

### Before Submitting

1. **Self-review** your changes
2. **Run tests** and linting:
   ```bash
   pnpm run lint
   pnpm run test
   ```
3. **Build the project**:
   ```bash
   pnpm run build
   ```
4. **Update documentation** if needed
5. **Add tests** for new features or bug fixes

### Creating a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to the main repository on GitHub
3. Click "Compare & pull request"
4. Fill out the **PR template** with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/videos for UI changes
   - Testing instructions
   - Any breaking changes

5. Submit the PR

### PR Review Process

- **At least 2 approvals** required for merge
- Address reviewer feedback promptly
- Request re-review after making changes
- Keep PR focused and manageable (aim for < 400 lines)

### Merging

- Use "Squash and merge" for feature branches
- Use "Create a merge commit" for release branches
- Maintainers handle the final merge

---

## Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code (no plain `.js` files)
- Follow ESLint configuration (`eslint.config.js`)
- Use Prettier for formatting (`npx prettier --write <file>`)
- Strict type checking enabled

### React/React Native

- Prefer functional components with hooks; class components are allowed only for error boundaries
- Memoize components when appropriate (`React.memo`)
- Use descriptive component names
- Colocate styles with components

### File Structure

```
src/
├── components/    # Reusable UI components
├── screens/       # Screen/page components
├── services/      # API calls and external services
├── utils/         # Utility functions
├── types/         # TypeScript types and interfaces
├── hooks/         # Custom React hooks
└── contexts/      # React contexts
```

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Functions/Variables**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`UserData`, `ApiResponse`)
- **Files**: Match export name or camelCase for utilities

### Code Quality

- Keep functions focused and small
- Avoid deeply nested logic
- Use early returns and guard clauses
- Add comments for complex logic
- Remove console logs before committing

---

## Testing

### Writing Tests

- Write tests for new features
- Aim for at least 80% code coverage
- Use descriptive test names
- Follow the test file co-location pattern

```typescript
// MyComponent.test.tsx
describe('MyComponent', () => {
  it('should render with correct text', () => {
    // arrange, act, assert
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

---

## Documentation

### When to Add Documentation

- New features or APIs
- Complex algorithms or business logic
- Setup or configuration changes
- Breaking changes

### Documentation Guidelines

- Use clear, concise language
- Include code examples
- Keep docs in sync with code
- Use Markdown formatting

### Types of Documentation

- **README.md** - Project overview
- **docs/** - Detailed guides and architecture
- **Inline comments** - For complex code
- **JSDoc** - For functions and components

---

## Reporting Issues

### Bug Reports

Use the [bug report template](./.github/ISSUE_TEMPLATE/bug_report.md) to report bugs:

1. Clear, descriptive title
2. Steps to reproduce
3. Expected vs. actual behavior
4. Screenshots/logs if applicable
5. Environment details

### Feature Requests

Use the [feature request template](./.github/ISSUE_TEMPLATE/feature_request.md):

1. Clear description of use case
2. Proposed solution
3. Alternative approaches considered
4. Additional context

---

## Questions?

- Check existing [issues](../../issues) and [discussions](../../discussions)
- Read the [documentation](./docs)
- Open a [discussion](../../discussions) for questions

Thank you for contributing to EpiCheck! 🎉
