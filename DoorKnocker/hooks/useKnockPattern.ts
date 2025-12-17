import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type KnockZone = 'L' | 'R';

export type KnockEvent = {
  zone: KnockZone;
  receivedAt: number;
  source: 'bluetooth' | 'simulated';
};

export type KnockMatch =
  | { status: 'listening' }
  | { status: 'matched'; codeName: keyof typeof ValidCodes }
  | { status: 'invalid' };

const RESET_MS = 6500;

export const ValidCodes = {
  kevin: ['L', 'L', 'R', 'R'] as KnockZone[],
  danny: ['R', 'R', 'L', 'L'] as KnockZone[],
};

function resolveMatch(sequence: KnockZone[]): KnockMatch {
  const entry = Object.entries(ValidCodes).find(
    ([, pattern]) => pattern.join('') === sequence.join('')
  );

  if (entry) {
    const [codeName] = entry as [keyof typeof ValidCodes, KnockZone[]];
    return { status: 'matched', codeName };
  }

  return sequence.length >= 4 ? { status: 'invalid' } : { status: 'listening' };
}

export function useKnockPattern(onValidCode?: (code: keyof typeof ValidCodes) => void) {
  const [sequence, setSequence] = useState<KnockEvent[]>([]);
  const [match, setMatch] = useState<KnockMatch>({ status: 'listening' });
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setSequence([]);
    setMatch({ status: 'listening' });
  }, [clearTimer]);

  const registerKnock = useCallback(
    (zone: KnockZone, source: KnockEvent['source']) => {
      clearTimer();
      setSequence((prev) => {
        const next = [...prev.slice(-3), { zone, receivedAt: Date.now(), source }];
        const zonesOnly = next.map((item) => item.zone);
        const nextMatch = resolveMatch(zonesOnly);

        setMatch(nextMatch);

        if (nextMatch.status === 'matched' && onValidCode) {
          onValidCode(nextMatch.codeName);
        }

        resetTimer.current = setTimeout(reset, RESET_MS);
        return nextMatch.status === 'invalid' ? [] : next;
      });
    },
    [clearTimer, onValidCode, reset]
  );

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const progress = useMemo(() => sequence.length / 4, [sequence.length]);

  return {
    sequence,
    match,
    progress,
    registerKnock,
    reset,
  };
}
