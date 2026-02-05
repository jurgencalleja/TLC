/**
 * PreviewPage Tests - TDD: Tests written first
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PreviewPage } from './PreviewPage';
import { useUIStore } from '../stores';

// Mock the stores
vi.mock('../stores', () => ({
  useUIStore: vi.fn(),
}));

describe('PreviewPage', () => {
  const mockSetActiveView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { setActiveView: typeof mockSetActiveView }) => unknown) =>
        selector({ setActiveView: mockSetActiveView })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('iframe rendering', () => {
    it('renders iframe with correct src', () => {
      render(<PreviewPage />);
      const iframe = screen.getByTitle('App Preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'http://localhost:3000');
    });

    it('displays the app URL', () => {
      render(<PreviewPage />);
      expect(screen.getByText('http://localhost:3000')).toBeInTheDocument();
    });

    it('renders iframe with custom URL when provided', () => {
      render(<PreviewPage defaultUrl="http://localhost:5173" />);
      const iframe = screen.getByTitle('App Preview');
      expect(iframe).toHaveAttribute('src', 'http://localhost:5173');
    });
  });

  describe('device toggle', () => {
    it('renders device toggle buttons', () => {
      render(<PreviewPage />);
      expect(screen.getByRole('button', { name: /phone/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tablet/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /desktop/i })).toBeInTheDocument();
    });

    it('changes iframe width to 375px for phone', () => {
      render(<PreviewPage />);
      const phoneButton = screen.getByRole('button', { name: /phone/i });
      fireEvent.click(phoneButton);

      const iframeContainer = screen.getByTestId('iframe-container');
      expect(iframeContainer).toHaveStyle({ width: '375px' });
    });

    it('changes iframe width to 768px for tablet', () => {
      render(<PreviewPage />);
      const tabletButton = screen.getByRole('button', { name: /tablet/i });
      fireEvent.click(tabletButton);

      const iframeContainer = screen.getByTestId('iframe-container');
      expect(iframeContainer).toHaveStyle({ width: '768px' });
    });

    it('changes iframe width to 100% for desktop', () => {
      render(<PreviewPage />);
      const desktopButton = screen.getByRole('button', { name: /desktop/i });
      fireEvent.click(desktopButton);

      const iframeContainer = screen.getByTestId('iframe-container');
      expect(iframeContainer).toHaveStyle({ width: '100%' });
    });

    it('defaults to desktop view', () => {
      render(<PreviewPage />);
      const iframeContainer = screen.getByTestId('iframe-container');
      expect(iframeContainer).toHaveStyle({ width: '100%' });
    });

    it('highlights the active device button', () => {
      render(<PreviewPage />);
      const desktopButton = screen.getByRole('button', { name: /desktop/i });
      expect(desktopButton).toHaveClass('btn-primary');

      const phoneButton = screen.getByRole('button', { name: /phone/i });
      fireEvent.click(phoneButton);
      expect(phoneButton).toHaveClass('btn-primary');
      expect(desktopButton).not.toHaveClass('btn-primary');
    });
  });

  describe('refresh functionality', () => {
    it('renders refresh button', () => {
      render(<PreviewPage />);
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('reloads iframe when refresh is clicked', async () => {
      render(<PreviewPage />);
      const iframe = screen.getByTitle('App Preview') as HTMLIFrameElement;
      const initialSrc = iframe.src;

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // The iframe src should be updated (even if to the same URL with timestamp)
      await waitFor(() => {
        const newIframe = screen.getByTitle('App Preview') as HTMLIFrameElement;
        // After refresh, we append a timestamp to force reload
        expect(newIframe.src).toContain('localhost:3000');
      });
    });
  });

  describe('open in new tab', () => {
    it('renders open in new tab button', () => {
      render(<PreviewPage />);
      expect(
        screen.getByRole('button', { name: /open.*new.*tab/i })
      ).toBeInTheDocument();
    });

    it('opens correct URL in new tab', () => {
      const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
      render(<PreviewPage />);

      const openButton = screen.getByRole('button', { name: /open.*new.*tab/i });
      fireEvent.click(openButton);

      expect(windowOpen).toHaveBeenCalledWith('http://localhost:3000', '_blank');
      windowOpen.mockRestore();
    });
  });

  describe('service selector', () => {
    const services = [
      { id: 'frontend', label: 'Frontend', url: 'http://localhost:3000' },
      { id: 'api', label: 'API Docs', url: 'http://localhost:8080/docs' },
      { id: 'storybook', label: 'Storybook', url: 'http://localhost:6006' },
    ];

    it('renders service selector when multiple services provided', () => {
      render(<PreviewPage services={services} />);
      expect(screen.getByRole('button', { name: /frontend/i })).toBeInTheDocument();
    });

    it('does not render service selector when no services provided', () => {
      render(<PreviewPage />);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('updates iframe URL when service is selected', () => {
      render(<PreviewPage services={services} />);

      // Open dropdown
      const dropdownTrigger = screen.getByRole('button', { name: /frontend/i });
      fireEvent.click(dropdownTrigger);

      // Select API Docs
      fireEvent.click(screen.getByText('API Docs'));

      const iframe = screen.getByTitle('App Preview');
      expect(iframe).toHaveAttribute('src', 'http://localhost:8080/docs');
    });

    it('shows current service in dropdown trigger', () => {
      render(<PreviewPage services={services} />);

      // Open dropdown and select different service
      fireEvent.click(screen.getByRole('button', { name: /frontend/i }));
      fireEvent.click(screen.getByText('Storybook'));

      // Trigger should now show Storybook
      expect(screen.getByRole('button', { name: /storybook/i })).toBeInTheDocument();
    });
  });

  describe('UI store integration', () => {
    it('sets active view to preview on mount', () => {
      render(<PreviewPage />);
      expect(mockSetActiveView).toHaveBeenCalledWith('preview');
    });
  });

  describe('page header', () => {
    it('renders page title', () => {
      render(<PreviewPage />);
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });
});
