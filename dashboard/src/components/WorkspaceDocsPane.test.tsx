import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { WorkspaceDocsPane } from './WorkspaceDocsPane.js';

describe('WorkspaceDocsPane', () => {
  describe('doc list', () => {
    it('renders doc list', () => {
      const docs = [
        { id: 'readme', name: 'README.md', path: '/docs/README.md', type: 'markdown' as const },
        { id: 'api', name: 'API.md', path: '/docs/API.md', type: 'markdown' as const },
      ];

      const { lastFrame } = render(<WorkspaceDocsPane docs={docs} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('README.md');
      expect(output).toContain('API.md');
    });

    it('shows doc count in header', () => {
      const docs = [
        { id: 'doc1', name: 'Doc1.md', path: '/docs/Doc1.md', type: 'markdown' as const },
        { id: 'doc2', name: 'Doc2.md', path: '/docs/Doc2.md', type: 'markdown' as const },
        { id: 'doc3', name: 'Doc3.md', path: '/docs/Doc3.md', type: 'markdown' as const },
      ];

      const { lastFrame } = render(<WorkspaceDocsPane docs={docs} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('3');
    });
  });

  describe('markdown content', () => {
    it('shows markdown content for selected doc', () => {
      const docs = [
        {
          id: 'readme',
          name: 'README.md',
          path: '/docs/README.md',
          type: 'markdown' as const,
          content: '# Project Title\n\nThis is the readme content.'
        },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          selectedDocId="readme"
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Project Title');
      expect(output).toContain('readme content');
    });

    it('renders headings distinctly', () => {
      const docs = [
        {
          id: 'doc1',
          name: 'Doc.md',
          path: '/docs/Doc.md',
          type: 'markdown' as const,
          content: '## Section Heading\n\nParagraph text.'
        },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          selectedDocId="doc1"
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Section Heading');
    });

    it('renders code blocks', () => {
      const docs = [
        {
          id: 'code-doc',
          name: 'Code.md',
          path: '/docs/Code.md',
          type: 'markdown' as const,
          content: '```typescript\nconst x = 1;\n```'
        },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          selectedDocId="code-doc"
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('const x = 1');
    });
  });

  describe('mermaid diagrams', () => {
    it('renders Mermaid diagrams', () => {
      const docs = [
        {
          id: 'arch',
          name: 'Architecture.md',
          path: '/docs/Architecture.md',
          type: 'markdown' as const,
          content: '```mermaid\ngraph TD\n  A[Start] --> B[End]\n```'
        },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          selectedDocId="arch"
          isActive={false}
        />
      );
      const output = lastFrame();

      // In terminal, mermaid is rendered as text representation
      expect(output).toContain('Mermaid');
    });

    it('shows diagram type indicator', () => {
      const docs = [
        {
          id: 'flow',
          name: 'Flow.md',
          path: '/docs/Flow.md',
          type: 'markdown' as const,
          content: '```mermaid\nsequenceDiagram\n  A->>B: Message\n```'
        },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          selectedDocId="flow"
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('sequenceDiagram');
    });
  });

  describe('doc links', () => {
    it('shows links between related docs', () => {
      const docs = [
        {
          id: 'main',
          name: 'Main.md',
          path: '/docs/Main.md',
          type: 'markdown' as const,
          content: 'See [API Documentation](./API.md)',
          linkedDocs: ['api']
        },
        {
          id: 'api',
          name: 'API.md',
          path: '/docs/API.md',
          type: 'markdown' as const
        },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          selectedDocId="main"
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('API');
    });

    it('indicates linked docs in list view', () => {
      const docs = [
        {
          id: 'main',
          name: 'Main.md',
          path: '/docs/Main.md',
          type: 'markdown' as const,
          linkedDocs: ['api', 'readme']
        },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          isActive={false}
        />
      );
      const output = lastFrame();

      // Should show link count
      expect(output).toContain('2');
    });
  });

  describe('loading state', () => {
    it('shows loading state', () => {
      const { lastFrame } = render(<WorkspaceDocsPane loading={true} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('Loading');
    });

    it('shows loading indicator while refreshing', () => {
      const docs = [
        { id: 'doc1', name: 'Doc.md', path: '/docs/Doc.md', type: 'markdown' as const },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane docs={docs} loading={true} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('Loading');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no docs', () => {
      const { lastFrame } = render(<WorkspaceDocsPane docs={[]} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('No docs');
    });

    it('shows hint to generate docs', () => {
      const { lastFrame } = render(<WorkspaceDocsPane docs={[]} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('/tlc');
    });
  });

  describe('refresh/regenerate', () => {
    it('shows refresh button when active', () => {
      const docs = [
        { id: 'doc1', name: 'Doc.md', path: '/docs/Doc.md', type: 'markdown' as const },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane docs={docs} isActive={true} />
      );
      const output = lastFrame();

      expect(output).toContain('Refresh');
    });

    it('accepts onRefresh callback prop', () => {
      const onRefresh = vi.fn();
      const docs = [
        { id: 'doc1', name: 'Doc.md', path: '/docs/Doc.md', type: 'markdown' as const },
      ];

      // Verify component renders with callback without errors
      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          isActive={true}
          onRefresh={onRefresh}
        />
      );
      const output = lastFrame();

      // Controls should be shown indicating 'r' key works
      expect(output).toContain('r');
      expect(output).toContain('Refresh');
    });

    it('shows regenerate option', () => {
      const docs = [
        { id: 'doc1', name: 'Doc.md', path: '/docs/Doc.md', type: 'markdown' as const },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane docs={docs} isActive={true} />
      );
      const output = lastFrame();

      expect(output).toContain('Regenerate');
    });

    it('accepts onRegenerate callback prop', () => {
      const onRegenerate = vi.fn();
      const docs = [
        { id: 'doc1', name: 'Doc.md', path: '/docs/Doc.md', type: 'markdown' as const },
      ];

      // Verify component renders with callback without errors
      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          isActive={true}
          onRegenerate={onRegenerate}
        />
      );
      const output = lastFrame();

      // Controls should be shown indicating 'g' key works
      expect(output).toContain('g');
      expect(output).toContain('Regenerate');
    });

    it('hides controls when not active', () => {
      const docs = [
        { id: 'doc1', name: 'Doc.md', path: '/docs/Doc.md', type: 'markdown' as const },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane docs={docs} isActive={false} />
      );
      const output = lastFrame();

      expect(output).not.toContain('Refresh');
    });
  });

  describe('navigation', () => {
    it('accepts onSelectDoc callback prop', () => {
      const onSelectDoc = vi.fn();
      const docs = [
        { id: 'doc1', name: 'First.md', path: '/docs/First.md', type: 'markdown' as const },
        { id: 'doc2', name: 'Second.md', path: '/docs/Second.md', type: 'markdown' as const },
      ];

      // Verify component renders with callback without errors
      const { lastFrame } = render(
        <WorkspaceDocsPane
          docs={docs}
          isActive={true}
          onSelectDoc={onSelectDoc}
        />
      );
      const output = lastFrame();

      // Controls should be shown indicating arrow keys work
      expect(output).toContain('arrows');
      expect(output).toContain('Navigate');
    });

    it('shows navigation hints when active', () => {
      const docs = [
        { id: 'doc1', name: 'Doc.md', path: '/docs/Doc.md', type: 'markdown' as const },
      ];

      const { lastFrame } = render(
        <WorkspaceDocsPane docs={docs} isActive={true} />
      );
      const output = lastFrame();

      expect(output).toContain('Navigate');
    });
  });
});
