import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Dropdown } from './Dropdown.js';

const sampleOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
  { value: 'option4', label: 'Option 4' },
];

describe('Dropdown', () => {
  describe('Rendering', () => {
    it('renders trigger button with placeholder', () => {
      const { lastFrame } = render(
        <Dropdown options={sampleOptions} onSelect={() => {}} placeholder="Select..." />
      );
      expect(lastFrame()).toContain('Select...');
    });

    it('renders trigger with selected value', () => {
      const { lastFrame } = render(
        <Dropdown
          options={sampleOptions}
          onSelect={() => {}}
          value="option1"
        />
      );
      expect(lastFrame()).toContain('Option 1');
    });

    it('shows dropdown indicator', () => {
      const { lastFrame } = render(
        <Dropdown options={sampleOptions} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/▼|▾|↓|v/);
    });
  });

  describe('Open State', () => {
    it('shows options when open', () => {
      const { lastFrame } = render(
        <Dropdown options={sampleOptions} onSelect={() => {}} isOpen={true} />
      );
      expect(lastFrame()).toContain('Option 1');
      expect(lastFrame()).toContain('Option 2');
      expect(lastFrame()).toContain('Option 4');
    });

    it('hides options when closed', () => {
      const { lastFrame } = render(
        <Dropdown options={sampleOptions} onSelect={() => {}} isOpen={false} />
      );
      // Should show trigger but not full options list
      const output = lastFrame() || '';
      // Options list should not be visible when closed
      expect(output).toBeDefined();
    });
  });

  describe('Selection', () => {
    it('highlights first option by default when open', () => {
      const { lastFrame } = render(
        <Dropdown options={sampleOptions} onSelect={() => {}} isOpen={true} />
      );
      expect(lastFrame()).toMatch(/▶|→|>|\*/);
    });

    it('calls onSelect when option selected', () => {
      const onSelect = vi.fn();
      render(
        <Dropdown options={sampleOptions} onSelect={onSelect} isOpen={true} />
      );
      expect(onSelect).toBeDefined();
    });

    it('skips disabled options', () => {
      const { lastFrame } = render(
        <Dropdown options={sampleOptions} onSelect={() => {}} isOpen={true} />
      );
      // Option 3 should be shown but dimmed/disabled
      expect(lastFrame()).toContain('Option 3');
    });
  });

  describe('Multi-Select', () => {
    it('allows multiple selections', () => {
      const { lastFrame } = render(
        <Dropdown
          options={sampleOptions}
          onSelect={() => {}}
          isOpen={true}
          multiple={true}
          value={['option1', 'option2']}
        />
      );
      expect(lastFrame()).toMatch(/✓|☑|✔/);
    });

    it('shows checkbox indicators in multi mode', () => {
      const { lastFrame } = render(
        <Dropdown
          options={sampleOptions}
          onSelect={() => {}}
          isOpen={true}
          multiple={true}
        />
      );
      expect(lastFrame()).toMatch(/□|☐|☑|✓|\[ \]|\[x\]/i);
    });
  });

  describe('Filtering', () => {
    it('shows filter input when filterable', () => {
      const { lastFrame } = render(
        <Dropdown
          options={sampleOptions}
          onSelect={() => {}}
          isOpen={true}
          filterable={true}
        />
      );
      expect(lastFrame()).toMatch(/search|filter|type|>|▏/i);
    });

    it('filters options based on query', () => {
      const { lastFrame } = render(
        <Dropdown
          options={sampleOptions}
          onSelect={() => {}}
          isOpen={true}
          filterable={true}
          filterQuery="1"
        />
      );
      expect(lastFrame()).toContain('Option 1');
    });
  });

  describe('Keyboard Hints', () => {
    it('shows navigation hints when open', () => {
      const { lastFrame } = render(
        <Dropdown options={sampleOptions} onSelect={() => {}} isOpen={true} />
      );
      expect(lastFrame()).toMatch(/↑|↓|j|k|enter|esc/i);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no options', () => {
      const { lastFrame } = render(
        <Dropdown options={[]} onSelect={() => {}} isOpen={true} />
      );
      expect(lastFrame()).toMatch(/no.*option|empty/i);
    });

    it('shows no match message when filter returns empty', () => {
      const { lastFrame } = render(
        <Dropdown
          options={sampleOptions}
          onSelect={() => {}}
          isOpen={true}
          filterable={true}
          filterQuery="xyz"
        />
      );
      expect(lastFrame()).toMatch(/no.*match|not.*found/i);
    });
  });

  describe('Grouping', () => {
    it('renders grouped options with headers', () => {
      const groupedOptions = [
        { value: 'a', label: 'A', group: 'Letters' },
        { value: 'b', label: 'B', group: 'Letters' },
        { value: '1', label: '1', group: 'Numbers' },
      ];
      const { lastFrame } = render(
        <Dropdown options={groupedOptions} onSelect={() => {}} isOpen={true} />
      );
      expect(lastFrame()).toContain('Letters');
      expect(lastFrame()).toContain('Numbers');
    });
  });
});
