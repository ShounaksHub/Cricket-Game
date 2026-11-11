import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const playersPage = readFileSync(
  new URL('../app/players/page.tsx', import.meta.url),
  'utf8',
);

describe('Players Archive conversion contract', () => {
  it('removes roster-building and marketplace copy from the player archive', () => {
    expect(playersPage).not.toMatch(/\bdraft\b/i);
    expect(playersPage).not.toMatch(/salary\s+cap/i);
    expect(playersPage).not.toMatch(/\bCOST\b/);
    expect(playersPage).not.toMatch(/[₹]|\bINR\b/);
    expect(playersPage).not.toMatch(/re[- ]?sell\s+tax/i);
    expect(playersPage).not.toMatch(/add(?:ed)?\s+to\s+(?:the\s+)?(?:current\s+)?squad/i);
    expect(playersPage).not.toMatch(/handleDraftPlayer|draftAlert/i);
    expect(playersPage).not.toMatch(/localStorage\.(?:getItem|setItem)/);
    expect(playersPage).not.toContain('cricket_dream_teams');
  });

  it('keeps real career-stat labels and an inspect-only archive interaction', () => {
    for (const label of ['RUNS', 'WICKETS', 'CAREER STATISTICS']) {
      expect(playersPage).toContain(label);
    }

    expect(playersPage).toContain('setInspectedPlayerId');
    expect(playersPage).toMatch(/onClick=\{\(e\)\s*=>\s*\{[^}]*setInspectedPlayerId/s);
    expect(playersPage).toMatch(/<span>View career record<\/span>/);
  });
});
