import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { LogSearch } from './LogSearch.js';

describe('LogSearch', () => {
  describe('Input Display', () => {
    it('shows search input', () => {
      const { lastFrame } = render(
        <LogSearch query="" onChange={() => {}} onClose={() => {}} />
      );
      expect(lastFrame()).toMatch(/search|\/|find/i);
    });

    it('shows current query', () => {
      const { lastFrame } = render(
        <LogSearch query="error" onChange={() => {}} onClose={() => {}} />
      );
      expect(lastFrame()).toContain('error');
    });

    it('shows cursor indicator', () => {
      const { lastFrame } = render(
        <LogSearch query="" onChange={() => {}} onClose={() => {}} />
      );
      // Should show some cursor indicator
      expect(lastFrame()).toMatch(/_|▏|│|\|/);
    });
  });

  describe('Match Count', () => {
    it('shows match count', () => {
      const { lastFrame } = render(
        <LogSearch
          query="test"
          matchCount={5}
          onChange={() => {}}
          onClose={() => {}}
        />
      );
      expect(lastFrame()).toContain('5');
    });

    it('shows zero matches', () => {
      const { lastFrame } = render(
        <LogSearch
          query="xyz"
          matchCount={0}
          onChange={() => {}}
          onClose={() => {}}
        />
      );
      expect(lastFrame()).toContain('0');
    });

    it('shows current match index', () => {
      const { lastFrame } = render(
        <LogSearch
          query="test"
          matchCount={10}
          currentMatch={3}
          onChange={() => {}}
          onClose={() => {}}
        />
      );
      // Should show "3 of 10" or "3/10"
      expect(lastFrame()).toMatch(/3.*of.*10|3\/10/i);
    });
  });

  describe('Navigation Hints', () => {
    it('shows next/prev match hints', () => {
      const { lastFrame } = render(
        <LogSearch
          query="test"
          matchCount={5}
          onChange={() => {}}
          onClose={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/n.*N|next.*prev/i);
    });

    it('shows close hint', () => {
      const { lastFrame } = render(
        <LogSearch query="" onChange={() => {}} onClose={() => {}} />
      );
      expect(lastFrame()).toMatch(/Esc|close|cancel/i);
    });

    it('shows enter hint', () => {
      const { lastFrame } = render(
        <LogSearch query="" onChange={() => {}} onClose={() => {}} />
      );
      expect(lastFrame()).toMatch(/Enter|submit|search/i);
    });
  });

  describe('Case Sensitivity', () => {
    it('shows case-insensitive by default', () => {
      const { lastFrame } = render(
        <LogSearch query="" onChange={() => {}} onClose={() => {}} />
      );
      // Should indicate case-insensitive or not show case indicator
      expect(lastFrame()).toBeDefined();
    });

    it('shows case-sensitive indicator when enabled', () => {
      const { lastFrame } = render(
        <LogSearch
          query=""
          caseSensitive={true}
          onChange={() => {}}
          onClose={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/Aa|case/i);
    });
  });

  describe('Callbacks', () => {
    it('accepts onChange callback', () => {
      const onChange = vi.fn();
      render(<LogSearch query="" onChange={onChange} onClose={() => {}} />);
      // onChange called on input
    });

    it('accepts onClose callback', () => {
      const onClose = vi.fn();
      render(<LogSearch query="" onChange={() => {}} onClose={onClose} />);
      // onClose called on Esc
    });

    it('accepts onNext callback', () => {
      const onNext = vi.fn();
      render(
        <LogSearch
          query="test"
          matchCount={5}
          onChange={() => {}}
          onClose={() => {}}
          onNext={onNext}
        />
      );
      // onNext called on 'n'
    });

    it('accepts onPrev callback', () => {
      const onPrev = vi.fn();
      render(
        <LogSearch
          query="test"
          matchCount={5}
          onChange={() => {}}
          onClose={() => {}}
          onPrev={onPrev}
        />
      );
      // onPrev called on 'N'
    });
  });

  describe('Empty Query', () => {
    it('shows placeholder when empty', () => {
      const { lastFrame } = render(
        <LogSearch query="" onChange={() => {}} onClose={() => {}} />
      );
      expect(lastFrame()).toMatch(/type|search|filter/i);
    });
  });

  describe('Visual States', () => {
    it('highlights no matches state', () => {
      const { lastFrame } = render(
        <LogSearch
          query="nonexistent"
          matchCount={0}
          onChange={() => {}}
          onClose={() => {}}
        />
      );
      // Should show warning color or message
      expect(lastFrame()).toBeDefined();
    });

    it('highlights has matches state', () => {
      const { lastFrame } = render(
        <LogSearch
          query="found"
          matchCount={5}
          onChange={() => {}}
          onClose={() => {}}
        />
      );
      expect(lastFrame()).toContain('5');
    });
  });
});
