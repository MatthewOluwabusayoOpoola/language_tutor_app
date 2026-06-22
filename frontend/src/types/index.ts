export type ConversationMode = 'normal' | 'romantic';

export interface User {
  id: string;
  email: string;
  name: string;
  country_code: string;
  city_code: string;
  country_english: string;
  city_english: string;
  turkish_nationality: string;
  turkish_from: string;
  turkish_city_locative: string;
}

export interface Progress {
  id: string;
  user_id: string;
  mode: ConversationMode;
  current_day: number;
  current_line: number;
  completed_days_json: number[];
  updated_at: string;
}

export interface AllProgress {
  normal: Progress;
  romantic: Progress;
  romantic_unlocked: boolean;
}

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

export interface Country {
  id: string;
  code: string;
  english_name: string;
  turkish_nationality: string;
  turkish_from: string;
}

export interface City {
  id: string;
  code: string;
  english_name: string;
  turkish_locative: string;
  country_code: string;
}

export interface PronunciationResult {
  passed: boolean;
  score: number;
  transcript: string;
  expected: string;
  correction_hint?: string;
  mispronunciations?: string[];
  attempt_count: number;
  progress?: Progress;
}
