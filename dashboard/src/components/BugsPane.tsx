import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';

// Bug severity levels
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

// Bug status levels
export type BugStatus = 'open' | 'in_progress' | 'fixed' | 'verified' | 'closed' | 'wontfix';

// Bug interface matching API response
export interface Bug {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: BugSeverity;
  reporter?: string;
  assignee?: string;
  issueId?: string;
  createdAt?: string;
  labels?: string[];
}

// Component props
export interface BugsPaneProps {
  isActive?: boolean;
  isTTY?: boolean;
  apiBaseUrl?: string;
}

// Filter types
type FilterType = 'all' | 'open' | 'closed';

// Severity color mapping
const severityColors: Record<BugSeverity, string> = {
  critical: 'red',
  high: 'yellow',
  medium: 'blue',
  low: 'gray',
};

// Status color mapping
const statusColors: Record<BugStatus, string> = {
  open: 'red',
  in_progress: 'yellow',
  fixed: 'green',
  verified: 'cyan',
  closed: 'gray',
  wontfix: 'magenta',
};

export function BugsPane({
  isActive = true,
  isTTY = true,
  apiBaseUrl = 'http://localhost:5001',
}: BugsPaneProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // List state
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Navigation state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<'form' | 'filters' | 'list'>('form');
  const [formField, setFormField] = useState<'title' | 'description' | 'severity'>('title');

  // Fetch bugs on mount and after submission
  const fetchBugs = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/bugs`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setBugs(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to fetch bugs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, [apiBaseUrl]);

  // Filter bugs
  const filteredBugs = useMemo(() => {
    switch (filter) {
      case 'open':
        return bugs.filter(b => b.status === 'open' || b.status === 'in_progress');
      case 'closed':
        return bugs.filter(b => b.status === 'closed' || b.status === 'fixed' || b.status === 'verified' || b.status === 'wontfix');
      default:
        return bugs;
    }
  }, [bugs, filter]);

  // Submit bug
  const submitBug = async () => {
    if (!title.trim()) {
      setSubmitMessage({ type: 'error', text: 'Title is required' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/bug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${title}\n\n${description}`.trim(),
          severity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // Clear form and refresh list
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setSubmitMessage({ type: 'success', text: 'Bug submitted successfully!' });
      await fetchBugs();

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitMessage(null), 3000);
    } catch (err) {
      setSubmitMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit bug',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard handling
  useInput((input, key) => {
    if (!isActive) return;

    // Tab to switch sections
    if (key.tab) {
      if (activeSection === 'form') {
        setActiveSection('filters');
      } else if (activeSection === 'filters') {
        setActiveSection('list');
      } else {
        setActiveSection('form');
      }
      return;
    }

    // Section-specific handling
    if (activeSection === 'form') {
      // Navigate form fields with up/down
      if (key.upArrow) {
        if (formField === 'description') setFormField('title');
        else if (formField === 'severity') setFormField('description');
      } else if (key.downArrow) {
        if (formField === 'title') setFormField('description');
        else if (formField === 'description') setFormField('severity');
      }

      // Severity selection with left/right
      if (formField === 'severity') {
        const severities: BugSeverity[] = ['low', 'medium', 'high', 'critical'];
        const currentIndex = severities.indexOf(severity);
        if (key.leftArrow && currentIndex > 0) {
          setSeverity(severities[currentIndex - 1]);
        } else if (key.rightArrow && currentIndex < severities.length - 1) {
          setSeverity(severities[currentIndex + 1]);
        }
      }

      // Enter to submit when on severity
      if (key.return && formField === 'severity') {
        submitBug();
      }

      // Type text in title/description fields
      if (formField === 'title' || formField === 'description') {
        if (key.backspace || key.delete) {
          if (formField === 'title') {
            setTitle(prev => prev.slice(0, -1));
          } else {
            setDescription(prev => prev.slice(0, -1));
          }
        } else if (input && !key.ctrl && !key.meta && input.length === 1) {
          if (formField === 'title') {
            setTitle(prev => prev + input);
          } else {
            setDescription(prev => prev + input);
          }
        }
      }
    } else if (activeSection === 'filters') {
      // Filter selection with 1, 2, 3 or arrow keys
      if (input === '1' || (key.leftArrow && filter !== 'all')) {
        setFilter('all');
      } else if (input === '2' || (key.rightArrow && filter === 'all')) {
        setFilter('open');
      } else if (input === '3' || (key.rightArrow && filter === 'open')) {
        setFilter('closed');
      }
    } else if (activeSection === 'list') {
      // Navigate bug list
      if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => Math.min(prev + 1, filteredBugs.length - 1));
      } else if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
    }

    // Refresh with 'r'
    if (input === 'r') {
      fetchBugs();
    }
  }, { isActive: isTTY });

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Bug Submission Form */}
      <Box
        flexDirection="column"
        borderStyle={activeSection === 'form' ? 'double' : 'single'}
        borderColor={activeSection === 'form' ? 'cyan' : 'gray'}
        padding={1}
        marginBottom={1}
      >
        <Text bold color="cyan">Submit New Bug</Text>

        {/* Title field */}
        <Box marginTop={1}>
          <Text color={formField === 'title' && activeSection === 'form' ? 'cyan' : 'white'}>
            Title:
          </Text>
          <Text>
            {title || (formField === 'title' && activeSection === 'form' ? '_' : '')}
            {formField === 'title' && activeSection === 'form' && <Text color="cyan">|</Text>}
          </Text>
        </Box>

        {/* Description field */}
        <Box marginTop={1}>
          <Text color={formField === 'description' && activeSection === 'form' ? 'cyan' : 'white'}>
            Description:
          </Text>
          <Text>
            {description || (formField === 'description' && activeSection === 'form' ? '_' : '')}
            {formField === 'description' && activeSection === 'form' && <Text color="cyan">|</Text>}
          </Text>
        </Box>

        {/* Severity selector */}
        <Box marginTop={1}>
          <Text color={formField === 'severity' && activeSection === 'form' ? 'cyan' : 'white'}>
            Severity:
          </Text>
          {(['low', 'medium', 'high', 'critical'] as BugSeverity[]).map((s) => (
            <Box key={s} marginLeft={1}>
              <Text
                backgroundColor={s === severity ? severityColors[s] : undefined}
                color={s === severity ? 'white' : severityColors[s]}
                bold={s === severity}
              >
                {s === severity ? `[${s.toUpperCase()}]` : s}
              </Text>
            </Box>
          ))}
        </Box>

        {/* Submit status */}
        <Box marginTop={1}>
          {isSubmitting ? (
            <Text color="yellow">
              <Spinner type="dots" /> Submitting...
            </Text>
          ) : submitMessage ? (
            <Text color={submitMessage.type === 'success' ? 'green' : 'red'}>
              {submitMessage.text}
            </Text>
          ) : (
            <Text dimColor>
              {formField === 'severity' ? 'Press Enter to submit' : 'Navigate with arrows, Tab to filters'}
            </Text>
          )}
        </Box>
      </Box>

      {/* Filter Buttons */}
      <Box
        borderStyle={activeSection === 'filters' ? 'double' : 'single'}
        borderColor={activeSection === 'filters' ? 'cyan' : 'gray'}
        paddingX={1}
        marginBottom={1}
      >
        <Text>Filters: </Text>
        {(['all', 'open', 'closed'] as FilterType[]).map((f, i) => (
          <Box key={f} marginLeft={1}>
            <Text dimColor>[{i + 1}] </Text>
            <Text
              color={f === filter ? 'cyan' : 'white'}
              bold={f === filter}
              underline={f === filter}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Box>
        ))}
        <Box marginLeft={2}>
          <Text dimColor>({filteredBugs.length} bugs)</Text>
        </Box>
      </Box>

      {/* Bug List */}
      <Box
        flexDirection="column"
        borderStyle={activeSection === 'list' ? 'double' : 'single'}
        borderColor={activeSection === 'list' ? 'cyan' : 'gray'}
        padding={1}
        flexGrow={1}
      >
        <Text bold color="cyan">Bug List</Text>

        {/* Loading state */}
        {isLoading ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">
              <Spinner type="dots" /> Loading bugs...
            </Text>
            {/* Loading skeleton */}
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>--- Loading... ---</Text>
              <Text dimColor>--- Loading... ---</Text>
              <Text dimColor>--- Loading... ---</Text>
            </Box>
          </Box>
        ) : loadError ? (
          <Box marginTop={1}>
            <Text color="red">Error: {loadError}</Text>
            <Text dimColor> (press r to retry)</Text>
          </Box>
        ) : filteredBugs.length === 0 ? (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>No bugs found</Text>
            <Text dimColor>
              {filter === 'all'
                ? 'Submit a bug above or wait for issues to appear'
                : `No ${filter} bugs - try changing the filter`}
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {filteredBugs.map((bug, index) => (
              <Box
                key={bug.id}
                flexDirection="row"
                paddingX={1}
                marginBottom={1}
                borderStyle={selectedIndex === index && activeSection === 'list' ? 'single' : undefined}
                borderColor={selectedIndex === index && activeSection === 'list' ? 'cyan' : undefined}
              >
                {/* Bug ID */}
                <Box width={10}>
                  <Text color="gray">{bug.id}</Text>
                </Box>

                {/* Severity badge */}
                <Box width={10}>
                  <Text
                    backgroundColor={severityColors[bug.priority] || 'gray'}
                    color="white"
                  >
                    {` ${(bug.priority || 'medium').toUpperCase()} `}
                  </Text>
                </Box>

                {/* Status badge */}
                <Box width={12}>
                  <Text color={statusColors[bug.status] || 'gray'}>
                    [{bug.status}]
                  </Text>
                </Box>

                {/* Title */}
                <Box flexGrow={1}>
                  <Text>{bug.title || bug.description?.split('\n')[0] || 'Untitled'}</Text>
                </Box>

                {/* Created date */}
                {bug.createdAt && (
                  <Box width={12}>
                    <Text dimColor>{bug.createdAt}</Text>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text dimColor>
          Tab: section | Arrows: navigate | r: refresh | Enter: submit
        </Text>
      </Box>
    </Box>
  );
}
