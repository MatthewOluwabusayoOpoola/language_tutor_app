import { Injectable } from '@nestjs/common';

@Injectable()
export class ScoringService {
  /**
   * Scores a transcript against an expected response.
   * Uses a combination of:
   * 1. Normalized Levenshtein distance for overall similarity
   * 2. Word-level overlap bonus for partial credit
   * Returns a score between 0.0 and 1.0.
   */
  score(transcript: string, expected: string): number {
    const t = this.normalize(transcript);
    const e = this.normalize(expected);

    if (t === e) return 1.0;
    if (t.length === 0) return 0.0;

    const levScore =
      1 - this.levenshteinDistance(t, e) / Math.max(t.length, e.length);
    const wordScore = this.wordOverlapScore(t, e);

    // Weighted blend: 60% character-level, 40% word-level
    return Math.min(1.0, levScore * 0.6 + wordScore * 0.4);
  }

  private normalize(text: string): string {
    let result = text
      // Use Turkish locale rules: plain .toLowerCase() expands "İ" into
      // "i" + a combining dot-above (2 codepoints), which silently breaks
      // exact-match comparisons against ASR transcripts (which emit a
      // plain single-codepoint "i"). toLocaleLowerCase('tr-TR') also
      // correctly maps ASCII "I" -> "ı" per Turkish casing rules.
      .toLocaleLowerCase('tr-TR')
      .normalize('NFC')
      .trim()
      // Normalize Turkish characters for comparison tolerance
      .replace(/[.,!?;:'"\u2019]/g, '')
      .replace(/\s+/g, ' ');

    // Browser speech recognition converts spoken numbers into digits
    // ("yirmi beş" -> "25"), but expected_response text is written out
    // in words. Canonicalize BOTH sides to digits so it doesn't matter
    // which form either one happens to be in.
    result = this.convertNumberWords(result);

    return result;
  }

  private static readonly NUMBER_UNITS: Record<string, number> = {
    bir: 1,
    iki: 2,
    üç: 3,
    dört: 4,
    beş: 5,
    altı: 6,
    yedi: 7,
    sekiz: 8,
    dokuz: 9,
  };

  private static readonly NUMBER_TENS: Record<string, number> = {
    on: 10,
    yirmi: 20,
    otuz: 30,
    kırk: 40,
    elli: 50,
    altmış: 60,
    yetmiş: 70,
    seksen: 80,
    doksan: 90,
  };

  // Case suffixes that can attach directly to a number word
  // ("ikide" = "iki" + "de" = "at two"). Kept short and unambiguous —
  // broader suffixes like plural "-lar" are deliberately excluded
  // (see NUMBER_FALSE_POSITIVES below for why).
  private static readonly NUMBER_SUFFIXES = [
    'den',
    'dan',
    'ten',
    'tan',
    'de',
    'da',
    'te',
    'ta',
    'ye',
    'ya',
    'e',
    'a',
  ];

  // Words that look like "on" ("ten") + a suffix but are actually the
  // unrelated 3rd-person pronoun "o" ("he/she/it") inflected — e.g.
  // "onlar" (they) is NOT "on" (ten) + "lar". Without this guard the
  // converter would corrupt these very common words.
  private static readonly NUMBER_FALSE_POSITIVES = new Set([
    'onlar',
    'onlara',
    'onları',
    'onların',
    'ona',
    'onu',
    'onun',
    'ondan',
    'onda',
    'onunla',
    'onsuz',
  ]);

  private matchNumberToken(
    word: string,
  ): { value: number; kind: 'unit' | 'ten' | 'scale'; suffix: string } | null {
    if (ScoringService.NUMBER_FALSE_POSITIVES.has(word)) return null;

    for (const [stem, value] of Object.entries(ScoringService.NUMBER_UNITS)) {
      if (word === stem) return { value, kind: 'unit', suffix: '' };
      if (word.startsWith(stem)) {
        const suffix = word.slice(stem.length);
        if (ScoringService.NUMBER_SUFFIXES.includes(suffix)) {
          return { value, kind: 'unit', suffix };
        }
      }
    }

    for (const [stem, value] of Object.entries(ScoringService.NUMBER_TENS)) {
      if (word === stem) return { value, kind: 'ten', suffix: '' };
      if (word.startsWith(stem)) {
        const suffix = word.slice(stem.length);
        if (ScoringService.NUMBER_SUFFIXES.includes(suffix)) {
          return { value, kind: 'ten', suffix };
        }
      }
    }

    for (const [stem, value] of [
      ['yüz', 100],
      ['bin', 1000],
    ] as [string, number][]) {
      if (word === stem) return { value, kind: 'scale', suffix: '' };
      if (word.startsWith(stem)) {
        const suffix = word.slice(stem.length);
        if (ScoringService.NUMBER_SUFFIXES.includes(suffix)) {
          return { value, kind: 'scale', suffix };
        }
      }
    }

    return null;
  }

  /**
   * Tries to parse a Turkish compound number ([thousands] bin [hundreds]
   * yüz [tens] [units], e.g. "beş yüz" = 500, "yirmi beş" = 25) starting
   * at `start`. Returns null if no number starts there.
   */
  private tryParseCompoundNumber(
    words: string[],
    start: number,
  ): { value: number; suffix: string; consumed: number } | null {
    let i = start;
    let value = 0;
    let suffix = '';
    let consumed = 0;

    // Thousands: [unit] bin
    const thousandTok =
      i < words.length ? this.matchNumberToken(words[i]) : null;
    if (thousandTok?.kind === 'unit' && words[i + 1] === 'bin') {
      value += thousandTok.value * 1000;
      i += 2;
      consumed = i - start;
    } else if (words[i] === 'bin') {
      value += 1000;
      i += 1;
      consumed = i - start;
    }

    // Hundreds: [unit] yüz
    const hundredTok =
      i < words.length ? this.matchNumberToken(words[i]) : null;
    if (hundredTok?.kind === 'unit' && words[i + 1] === 'yüz') {
      value += hundredTok.value * 100;
      i += 2;
      consumed = i - start;
    } else if (words[i] === 'yüz') {
      value += 100;
      i += 1;
      consumed = i - start;
    }

    // Tens
    const tensTok = i < words.length ? this.matchNumberToken(words[i]) : null;
    if (tensTok?.kind === 'ten') {
      value += tensTok.value;
      i += 1;
      consumed = i - start;
      if (tensTok.suffix !== '') {
        // A suffix on the tens word means it's the end of the number
        // ("yirmiye" = "yirmi" + "ye" = "to twenty").
        return { value, suffix: tensTok.suffix, consumed };
      }
    }

    // Units
    const unitTok = i < words.length ? this.matchNumberToken(words[i]) : null;
    if (unitTok?.kind === 'unit') {
      const isBareOne =
        words[i] === 'bir' && unitTok.suffix === '' && consumed === 0;
      if (isBareOne) {
        // A standalone, unsuffixed "bir" is ambiguous: it's also the
        // indefinite article "a/an" ("bir çay" = "a tea", not "1 tea").
        // Only treat it as the number 1 if it sits next to another
        // number word (e.g. an enumerated list: "bir, iki, üç").
        const prevTok =
          start > 0 ? this.matchNumberToken(words[start - 1]) : null;
        const nextTok = words[i + 1]
          ? this.matchNumberToken(words[i + 1])
          : null;
        if (!prevTok && !nextTok) {
          return consumed > 0 ? { value, suffix, consumed } : null;
        }
      }
      value += unitTok.value;
      suffix = unitTok.suffix;
      i += 1;
      consumed = i - start;
    }

    if (consumed === 0) return null;
    return { value, suffix, consumed };
  }

  private convertNumberWords(text: string): string {
    const words = text.split(' ').filter(Boolean);
    const output: string[] = [];
    let i = 0;

    while (i < words.length) {
      const result = this.tryParseCompoundNumber(words, i);
      if (result) {
        output.push(`${result.value}${result.suffix}`);
        i += result.consumed;
      } else {
        output.push(words[i]);
        i += 1;
      }
    }

    return output.join(' ');
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  private isNumericToken(word: string): boolean {
    return /^\d+[a-zçğıöşü]*$/.test(word);
  }

  /**
   * Compares each expected word against the transcript's words using
   * Levenshtein similarity instead of exact string equality. A single
   * mis-transcribed letter (common ASR noise, especially around the
   * Turkish soft-ğ) now earns partial credit instead of scoring the
   * whole word as 0 — exact/near matches (>=85% similar) still earn
   * full credit so this doesn't get any more lenient on real mistakes.
   * Numbers are the exception: they're matched exactly (see below).
   */
  private wordOverlapScore(transcript: string, expected: string): number {
    const tWords = transcript.split(' ').filter(Boolean);
    const eWords = expected.split(' ').filter(Boolean);

    if (eWords.length === 0) return 0;
    if (tWords.length === 0) return 0;

    // Counting/recitation drills (e.g. "1 2 3 4") have no concept of
    // "mostly right" — reciting 1, 2, 3, 5 is a wrong recitation, not
    // 75% correct. Require the full sequence to match exactly.
    const isPureNumberList = eWords.every((w) => this.isNumericToken(w));
    if (isPureNumberList) {
      return eWords.length === tWords.length &&
        eWords.every((w, idx) => w === tWords[idx])
        ? 1
        : 0;
    }

    let total = 0;
    for (const ew of eWords) {
      let best = 0;
      for (const tw of tWords) {
        // Numbers have no meaningful "partial similarity" — "4" vs "5",
        // or "2de" vs "3de", is just a different number, not a near-miss
        // pronunciation. Require an exact match for these.
        if (this.isNumericToken(ew) || this.isNumericToken(tw)) {
          const similarity = ew === tw ? 1 : 0;
          if (similarity > best) best = similarity;
          continue;
        }
        const maxLen = Math.max(ew.length, tw.length, 1);
        const similarity = 1 - this.levenshteinDistance(ew, tw) / maxLen;
        if (similarity > best) best = similarity;
      }
      // Near-exact matches count as fully correct; anything else
      // contributes its raw similarity as partial credit.
      total += best >= 0.85 ? 1 : best;
    }

    return total / eWords.length;
  }
}
