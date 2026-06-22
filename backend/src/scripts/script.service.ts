import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ConversationMode } from '../entities/progress.entity';

export interface ScriptLine {
  line_number: number;
  speaker: 'app' | 'user';
  turkish?: string;
  slow_phonetic?: string;
  english?: string;
  user_prompt?: string;
  expected_response: string;
  mispronunciations?: string[];
  correction_hint?: string;
  min_score: number;
}

export interface ScriptDay {
  day: number;
  total_minutes: number;
  new_minutes: number;
  lines: ScriptLine[];
}

interface ScriptFile {
  app_name: string;
  total_days: number;
  days: ScriptDay[];
}

@Injectable()
export class ScriptService implements OnModuleInit {
  private scripts: Map<ConversationMode, ScriptFile> = new Map();

  onModuleInit() {
    this.loadScripts();
  }

  private loadScripts() {
    const scriptsDir = path.join(__dirname);
    const sourceScriptsDir = path.join(
      scriptsDir,
      '..',
      '..',
      'src',
      'scripts',
    );

    const normalPath = path.join(scriptsDir, 'normal_conversation_script.json');
    const romanticPath = path.join(
      scriptsDir,
      'romantic_conversation_script.json',
    );
    const nestedNormalPath = path.join(
      scriptsDir,
      'scripts',
      'normal_conversation_script.json',
    );
    const nestedRomanticPath = path.join(
      scriptsDir,
      'scripts',
      'romantic_conversation_script.json',
    );
    const sourceNormalPath = path.join(
      sourceScriptsDir,
      'normal_conversation_script.json',
    );
    const sourceRomanticPath = path.join(
      sourceScriptsDir,
      'romantic_conversation_script.json',
    );

    const resolvedNormalPath = [
      normalPath,
      nestedNormalPath,
      sourceNormalPath,
    ].find((p) => fs.existsSync(p));
    const resolvedRomanticPath = [
      romanticPath,
      nestedRomanticPath,
      sourceRomanticPath,
    ].find((p) => fs.existsSync(p));

    if (!resolvedNormalPath || !resolvedRomanticPath) {
      throw new Error(
        `Script files not found. Tried: ${[
          normalPath,
          nestedNormalPath,
          sourceNormalPath,
          romanticPath,
          nestedRomanticPath,
          sourceRomanticPath,
        ].join(', ')}`,
      );
    }

    this.scripts.set(
      ConversationMode.NORMAL,
      JSON.parse(fs.readFileSync(resolvedNormalPath, 'utf-8')),
    );
    this.scripts.set(
      ConversationMode.ROMANTIC,
      JSON.parse(fs.readFileSync(resolvedRomanticPath, 'utf-8')),
    );
  }

  getDay(
    mode: ConversationMode,
    day: number,
    personalization?: {
      name?: string;
      turkish_nationality?: string;
      turkish_from?: string;
      turkish_city_locative?: string;
    },
  ): ScriptDay | null {
    const script = this.scripts.get(mode);
    if (!script) return null;

    const dayData = script.days.find((d) => d.day === day);
    if (!dayData) return null;

    if (!personalization) return dayData;

    // Deep clone to avoid mutating cached data
    const cloned: ScriptDay = JSON.parse(JSON.stringify(dayData));

    const tokens: Record<string, string> = {
      Matthew: personalization.name ?? 'Matthew',
      Nijeryalıyım: personalization.turkish_nationality ?? 'Nijeryalıyım',
      "Nijerya'dan geliyorum":
        personalization.turkish_from ?? "Nijerya'dan geliyorum",
      "Lefkoşa'da yaşıyorum":
        personalization.turkish_city_locative ?? "Lefkoşa'da yaşıyorum",
    };

    cloned.lines = cloned.lines.map((line) => {
      let {
        turkish,
        english,
        user_prompt,
        expected_response,
        correction_hint,
        slow_phonetic,
      } = line;

      for (const [token, value] of Object.entries(tokens)) {
        const re = new RegExp(token, 'g');
        if (turkish) turkish = turkish.replace(re, value);
        if (english) english = english.replace(re, value);
        if (user_prompt) user_prompt = user_prompt.replace(re, value);
        if (expected_response)
          expected_response = expected_response.replace(re, value);
        if (correction_hint)
          correction_hint = correction_hint.replace(re, value);
        if (slow_phonetic) slow_phonetic = slow_phonetic.replace(re, value);
      }

      return {
        ...line,
        turkish,
        english,
        user_prompt,
        expected_response,
        correction_hint,
        slow_phonetic,
      };
    });

    return cloned;
  }

  getTotalLines(mode: ConversationMode, day: number): number {
    const dayData = this.getDay(mode, day);
    return dayData?.lines.length ?? 0;
  }

  /**
   * Get cumulative script for a day: includes all lines from day 1 through the requested day.
   * Lines from days < requested day are marked as is_review=true.
   * Lines from the requested day are marked as is_review=false.
   */
  getDayCumulative(
    mode: ConversationMode,
    day: number,
    personalization?: {
      name?: string;
      turkish_nationality?: string;
      turkish_from?: string;
      turkish_city_locative?: string;
    },
  ): ScriptDay | null {
    const script = this.scripts.get(mode);
    if (!script) return null;

    const requestedDay = script.days.find((d) => d.day === day);
    if (!requestedDay) return null;

    // Collect all lines from day 1 to requested day
    const allLines: ScriptLine[] = [];
    let totalMinutes = 0;
    let newMinutes = 0;

    for (let d = 1; d <= day; d++) {
      const dayData = script.days.find((sd) => sd.day === d);
      if (!dayData) continue;

      const isReview = d < day;
      const linesForDay = dayData.lines.map((line, idx) => {
        // Renumber lines sequentially across all days
        return {
          ...line,
          line_number: allLines.length + idx + 1,
          is_review: isReview,
        };
      });

      allLines.push(...linesForDay);
      totalMinutes += dayData.total_minutes;
      if (!isReview) {
        newMinutes = dayData.new_minutes; // Only count new minutes from current day
      }
    }

    // Create result with cumulative lines
    let result: ScriptDay = {
      day,
      total_minutes: totalMinutes,
      new_minutes: newMinutes,
      lines: allLines,
    };

    if (!personalization) return result;

    // Apply personalization to all lines
    const cloned: ScriptDay = JSON.parse(JSON.stringify(result));

    const tokens: Record<string, string> = {
      Matthew: personalization.name ?? 'Matthew',
      Nijeryalıyım: personalization.turkish_nationality ?? 'Nijeryalıyım',
      "Nijerya'dan geliyorum":
        personalization.turkish_from ?? "Nijerya'dan geliyorum",
      "Lefkoşa'da yaşıyorum":
        personalization.turkish_city_locative ?? "Lefkoşa'da yaşıyorum",
    };

    cloned.lines = cloned.lines.map((line) => {
      let {
        turkish,
        english,
        user_prompt,
        expected_response,
        correction_hint,
        slow_phonetic,
      } = line;

      for (const [token, value] of Object.entries(tokens)) {
        const re = new RegExp(token, 'g');
        if (turkish) turkish = turkish.replace(re, value);
        if (english) english = english.replace(re, value);
        if (user_prompt) user_prompt = user_prompt.replace(re, value);
        if (expected_response)
          expected_response = expected_response.replace(re, value);
        if (correction_hint)
          correction_hint = correction_hint.replace(re, value);
        if (slow_phonetic) slow_phonetic = slow_phonetic.replace(re, value);
      }

      return {
        ...line,
        turkish,
        english,
        user_prompt,
        expected_response,
        correction_hint,
        slow_phonetic,
      };
    });

    return cloned;
  }
}
