import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TestFileViewer } from './TestFileViewer';

const mockTestFile = {
  path: 'tests/auth/login.spec.ts',
  name: 'login.spec.ts',
  content: `import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@test.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});`,
  language: 'typescript',
};

describe('TestFileViewer', () => {
  it('renders test file content', () => {
    render(<TestFileViewer file={mockTestFile} />);
    expect(screen.getByTestId('test-file-viewer')).toBeInTheDocument();
  });

  it('displays file path', () => {
    render(<TestFileViewer file={mockTestFile} />);
    expect(screen.getByText('tests/auth/login.spec.ts')).toBeInTheDocument();
  });

  it('shows syntax highlighted code', () => {
    render(<TestFileViewer file={mockTestFile} />);
    expect(screen.getByTestId('code-block')).toBeInTheDocument();
  });

  it('shows line numbers', () => {
    render(<TestFileViewer file={mockTestFile} />);
    expect(screen.getByTestId('line-numbers')).toBeInTheDocument();
  });

  it('is read-only (no editing)', () => {
    render(<TestFileViewer file={mockTestFile} />);
    const codeBlock = screen.getByTestId('code-block');
    expect(codeBlock).not.toHaveAttribute('contenteditable', 'true');
  });

  it('has copy button', () => {
    render(<TestFileViewer file={mockTestFile} />);
    expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
  });

  it('copies code on button click', () => {
    const mockClipboard = { writeText: vi.fn() };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<TestFileViewer file={mockTestFile} />);
    fireEvent.click(screen.getByLabelText('Copy code'));

    expect(mockClipboard.writeText).toHaveBeenCalledWith(mockTestFile.content);
  });

  it('shows language label', () => {
    render(<TestFileViewer file={mockTestFile} />);
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TestFileViewer file={mockTestFile} className="custom-viewer" />);
    expect(screen.getByTestId('test-file-viewer')).toHaveClass('custom-viewer');
  });
});
