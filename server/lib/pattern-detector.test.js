import { describe, it, expect } from 'vitest';
import { detectPatterns, PATTERN_TYPES } from './pattern-detector.js';

describe('pattern-detector', () => {
  describe('detectPatterns', () => {
    describe('decision patterns', () => {
      it('detects "let\'s use X instead of Y" pattern', () => {
        const exchange = {
          user: "let's use Stripe instead of Paddle",
          assistant: "Good choice, Stripe has better webhook support..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.decisions).toHaveLength(1);
        expect(detected.decisions[0]).toMatchObject({
          type: 'decision',
          choice: expect.stringContaining('Stripe'),
        });
      });

      it('detects "we decided to" pattern', () => {
        const exchange = {
          user: "we decided to use PostgreSQL for the database",
          assistant: "Great, I'll set up the schema..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.decisions).toHaveLength(1);
        expect(detected.decisions[0].choice).toContain('PostgreSQL');
      });

      it('detects "going with X" pattern', () => {
        const exchange = {
          user: "going with REST instead of GraphQL",
          assistant: "Sounds good..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.decisions).toHaveLength(1);
        expect(detected.decisions[0].choice).toContain('REST');
      });

      it('extracts reasoning from decision', () => {
        const exchange = {
          user: "let's use Redis because we need fast caching",
          assistant: "Good choice..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.decisions[0].reasoning).toContain('fast caching');
      });
    });

    describe('preference patterns', () => {
      it('detects "I prefer" pattern', () => {
        const exchange = {
          user: "I prefer functional programming style",
          assistant: "Got it, I'll use functional patterns..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.preferences).toHaveLength(1);
        expect(detected.preferences[0].preference).toContain('functional');
      });

      it('detects correction pattern "no, use X not Y"', () => {
        const exchange = {
          user: "no, use named exports not default",
          assistant: "Got it, switching to named exports..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.preferences).toHaveLength(1);
        expect(detected.preferences[0].preference).toContain('named exports');
        expect(detected.preferences[0].antiPreference).toContain('default');
      });

      it('detects "always use" pattern', () => {
        const exchange = {
          user: "always use arrow functions for callbacks",
          assistant: "Understood..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.preferences).toHaveLength(1);
        expect(detected.preferences[0].preference).toContain('arrow functions');
      });

      it('detects "don\'t use" pattern', () => {
        const exchange = {
          user: "don't use classes, use plain objects",
          assistant: "Sure, I'll use object literals..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.preferences.length).toBeGreaterThanOrEqual(1);
        const hasClassesAnti = detected.preferences.some(p =>
          p.antiPreference && p.antiPreference.includes('classes')
        );
        expect(hasClassesAnti).toBe(true);
      });
    });

    describe('gotcha patterns', () => {
      it('detects "needs to warm up" gotcha', () => {
        const exchange = {
          user: "ah the auth service needs time to warm up",
          assistant: "I see, adding a delay..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.gotchas).toHaveLength(1);
        expect(detected.gotchas[0].subject).toContain('auth service');
        expect(detected.gotchas[0].issue).toContain('warm up');
      });

      it('detects "watch out for" pattern', () => {
        const exchange = {
          user: "watch out for race conditions in the queue handler",
          assistant: "Good point, I'll add locking..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.gotchas).toHaveLength(1);
        expect(detected.gotchas[0].issue).toContain('race conditions');
      });

      it('detects "doesn\'t work because" pattern', () => {
        const exchange = {
          user: "the API call doesn't work because of CORS",
          assistant: "I'll configure the proxy..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.gotchas).toHaveLength(1);
        expect(detected.gotchas[0].issue).toContain('CORS');
      });

      it('detects "remember that" pattern', () => {
        const exchange = {
          user: "remember that the database needs migrations first",
          assistant: "Right, running migrations..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.gotchas.length).toBeGreaterThanOrEqual(1);
        const hasMigrations = detected.gotchas.some(g =>
          g.issue && g.issue.includes('migrations')
        );
        expect(hasMigrations).toBe(true);
      });
    });

    describe('reasoning patterns', () => {
      it('detects "because" reasoning', () => {
        const exchange = {
          user: "because the team already knows React",
          assistant: "Makes sense..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.reasoning).toHaveLength(1);
        expect(detected.reasoning[0].content).toContain('team already knows React');
      });

      it('detects "the reason is" pattern', () => {
        const exchange = {
          user: "the reason is we need SSR for SEO",
          assistant: "Understood..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.reasoning).toHaveLength(1);
        expect(detected.reasoning[0].content).toContain('SSR for SEO');
      });
    });

    describe('edge cases', () => {
      it('returns empty arrays for non-memorable exchange', () => {
        const exchange = {
          user: "what time is it?",
          assistant: "I don't have access to current time"
        };

        const detected = detectPatterns(exchange);

        expect(detected.decisions).toHaveLength(0);
        expect(detected.preferences).toHaveLength(0);
        expect(detected.gotchas).toHaveLength(0);
        expect(detected.reasoning).toHaveLength(0);
      });

      it('handles empty exchange', () => {
        const detected = detectPatterns({ user: '', assistant: '' });

        expect(detected.decisions).toHaveLength(0);
        expect(detected.preferences).toHaveLength(0);
      });

      it('handles undefined exchange', () => {
        const detected = detectPatterns({});

        expect(detected.decisions).toHaveLength(0);
      });

      it('detects multiple patterns in one exchange', () => {
        const exchange = {
          user: "let's use TypeScript because it's safer. Also, I prefer tabs over spaces",
          assistant: "Got it..."
        };

        const detected = detectPatterns(exchange);

        expect(detected.decisions.length + detected.preferences.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('PATTERN_TYPES', () => {
    it('exports pattern type constants', () => {
      expect(PATTERN_TYPES.DECISION).toBe('decision');
      expect(PATTERN_TYPES.PREFERENCE).toBe('preference');
      expect(PATTERN_TYPES.GOTCHA).toBe('gotcha');
      expect(PATTERN_TYPES.REASONING).toBe('reasoning');
    });
  });
});
