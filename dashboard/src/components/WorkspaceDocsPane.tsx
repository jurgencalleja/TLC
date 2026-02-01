import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

export interface WorkspaceDoc {
  id: string;
  name: string;
  path: string;
  type: 'markdown' | 'mermaid';
  content?: string;
  linkedDocs?: string[];
}

export interface WorkspaceDocsPaneProps {
  docs?: WorkspaceDoc[];
  selectedDocId?: string;
  loading?: boolean;
  isActive: boolean;
  onRefresh?: () => void;
  onRegenerate?: () => void;
  onSelectDoc?: (docId: string) => void;
}

/**
 * Parse markdown content and render as terminal-friendly text
 */
function renderMarkdownLine(line: string): { text: string; bold: boolean; dimColor: boolean; color?: string } {
  // Heading detection
  if (line.startsWith('# ')) {
    return { text: line.slice(2), bold: true, dimColor: false, color: 'cyan' };
  }
  if (line.startsWith('## ')) {
    return { text: line.slice(3), bold: true, dimColor: false, color: 'cyan' };
  }
  if (line.startsWith('### ')) {
    return { text: line.slice(4), bold: true, dimColor: false };
  }

  return { text: line, bold: false, dimColor: false };
}

/**
 * Parse markdown content into renderable blocks
 */
interface ContentBlock {
  type: 'text' | 'heading' | 'code' | 'mermaid';
  content: string;
  language?: string;
}

function parseMarkdown(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for code blocks (including mermaid)
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      if (language === 'mermaid') {
        blocks.push({
          type: 'mermaid',
          content: codeLines.join('\n'),
          language: 'mermaid'
        });
      } else {
        blocks.push({
          type: 'code',
          content: codeLines.join('\n'),
          language: language || 'text'
        });
      }
      i++;
      continue;
    }

    // Check for headings
    if (line.startsWith('#')) {
      blocks.push({
        type: 'heading',
        content: line.replace(/^#+\s*/, '')
      });
      i++;
      continue;
    }

    // Regular text
    if (line.trim()) {
      blocks.push({
        type: 'text',
        content: line
      });
    }
    i++;
  }

  return blocks;
}

/**
 * Render a content block as Ink elements
 */
function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <Box marginTop={1}>
          <Text bold color="cyan">{block.content}</Text>
        </Box>
      );

    case 'code':
      return (
        <Box marginTop={1} flexDirection="column" borderStyle="single" paddingX={1}>
          <Text dimColor>{block.language}</Text>
          <Text>{block.content}</Text>
        </Box>
      );

    case 'mermaid':
      return (
        <Box marginTop={1} flexDirection="column" borderStyle="double" paddingX={1}>
          <Text bold color="magenta">Mermaid Diagram</Text>
          <Text dimColor>{block.content}</Text>
        </Box>
      );

    case 'text':
    default:
      return <Text>{block.content}</Text>;
  }
}

/**
 * Doc list item component
 */
function DocListItem({
  doc,
  isSelected,
}: {
  doc: WorkspaceDoc;
  isSelected: boolean;
}) {
  const linkCount = doc.linkedDocs?.length || 0;

  return (
    <Box>
      <Text
        color={isSelected ? 'cyan' : undefined}
        bold={isSelected}
        underline={isSelected}
      >
        {isSelected ? '> ' : '  '}{doc.name}
      </Text>
      {linkCount > 0 && (
        <Text dimColor> ({linkCount} links)</Text>
      )}
    </Box>
  );
}

/**
 * Document content viewer
 */
function DocContentView({ doc }: { doc: WorkspaceDoc }) {
  if (!doc.content) {
    return (
      <Box marginTop={1}>
        <Text dimColor>No content available</Text>
      </Box>
    );
  }

  const blocks = parseMarkdown(doc.content);

  return (
    <Box flexDirection="column" marginTop={1} borderStyle="single" paddingX={1}>
      <Text bold>{doc.name}</Text>
      {blocks.map((block, idx) => (
        <ContentBlockView key={idx} block={block} />
      ))}
    </Box>
  );
}

export function WorkspaceDocsPane({
  docs = [],
  selectedDocId,
  loading = false,
  isActive,
  onRefresh,
  onRegenerate,
  onSelectDoc,
}: WorkspaceDocsPaneProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get actual selected doc (from prop or from index)
  const actualSelectedDocId = selectedDocId || docs[selectedIndex]?.id;
  const selectedDoc = docs.find(d => d.id === actualSelectedDocId);

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Navigation
      if (key.upArrow) {
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        if (docs[newIndex] && onSelectDoc) {
          onSelectDoc(docs[newIndex].id);
        }
      }
      if (key.downArrow) {
        const newIndex = Math.min(docs.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        if (docs[newIndex] && onSelectDoc) {
          onSelectDoc(docs[newIndex].id);
        }
      }

      // Actions
      if (input === 'r') {
        onRefresh?.();
      }
      if (input === 'g') {
        onRegenerate?.();
      }
    },
    { isActive }
  );

  // Loading state
  if (loading) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="yellow">Loading docs...</Text>
      </Box>
    );
  }

  // Empty state
  if (docs.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Workspace Docs</Text>
        <Box marginTop={1}>
          <Text color="gray">No docs generated yet.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run /tlc:workspace-docs to generate documentation</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Workspace Docs</Text>
        <Text dimColor> ({docs.length})</Text>
      </Box>

      {/* Doc List */}
      <Box flexDirection="column">
        {docs.slice(0, 10).map((doc, idx) => (
          <DocListItem
            key={doc.id}
            doc={doc}
            isSelected={doc.id === actualSelectedDocId}
          />
        ))}
        {docs.length > 10 && (
          <Text dimColor>... and {docs.length - 10} more</Text>
        )}
      </Box>

      {/* Selected Doc Content */}
      {selectedDoc && <DocContentView doc={selectedDoc} />}

      {/* Controls */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            [arrows] Navigate  [r] Refresh  [g] Regenerate
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default WorkspaceDocsPane;
