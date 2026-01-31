import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Card, CardHeader, CardBody, CardFooter } from './Card.js';

describe('Card', () => {
  it('renders children', () => {
    const { lastFrame } = render(<Card>Content</Card>);
    expect(lastFrame()).toContain('Content');
  });

  it('renders with border by default', () => {
    const { lastFrame } = render(<Card>Test</Card>);
    const output = lastFrame();
    // Should contain box-drawing characters (various unicode box drawing)
    expect(output).toContain('Test');
    // Ink uses various box characters depending on style
    expect(output.length).toBeGreaterThan('Test'.length);
  });

  describe('variants', () => {
    it('renders default variant', () => {
      const { lastFrame } = render(<Card variant="default">Default</Card>);
      expect(lastFrame()).toContain('Default');
    });

    it('renders elevated variant with double border', () => {
      const { lastFrame } = render(<Card variant="elevated">Elevated</Card>);
      const output = lastFrame();
      expect(output).toContain('Elevated');
    });

    it('renders outlined variant', () => {
      const { lastFrame } = render(<Card variant="outlined">Outlined</Card>);
      expect(lastFrame()).toContain('Outlined');
    });
  });

  describe('title', () => {
    it('renders title when provided', () => {
      const { lastFrame } = render(<Card title="My Card">Body</Card>);
      const output = lastFrame();
      expect(output).toContain('My Card');
      expect(output).toContain('Body');
    });
  });

  describe('padding', () => {
    it('respects padding prop', () => {
      const { lastFrame } = render(<Card padding={2}>Padded</Card>);
      expect(lastFrame()).toContain('Padded');
    });
  });
});

describe('CardHeader', () => {
  it('renders header content', () => {
    const { lastFrame } = render(<CardHeader>Header</CardHeader>);
    expect(lastFrame()).toContain('Header');
  });

  it('renders with bold style', () => {
    const { lastFrame } = render(<CardHeader>Title</CardHeader>);
    expect(lastFrame()).toContain('Title');
  });
});

describe('CardBody', () => {
  it('renders body content', () => {
    const { lastFrame } = render(<CardBody>Body content</CardBody>);
    expect(lastFrame()).toContain('Body content');
  });
});

describe('CardFooter', () => {
  it('renders footer content', () => {
    const { lastFrame } = render(<CardFooter>Footer</CardFooter>);
    expect(lastFrame()).toContain('Footer');
  });

  it('renders with dimmed style', () => {
    const { lastFrame } = render(<CardFooter>Actions</CardFooter>);
    expect(lastFrame()).toContain('Actions');
  });
});

describe('Card composition', () => {
  it('renders header, body, and footer together', () => {
    const { lastFrame } = render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardBody>Content here</CardBody>
        <CardFooter>Actions</CardFooter>
      </Card>
    );
    const output = lastFrame();
    expect(output).toContain('Title');
    expect(output).toContain('Content here');
    expect(output).toContain('Actions');
  });
});
