import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Progress, ConversationMode } from '../entities/progress.entity';
import { Attempt } from '../entities/attempt.entity';

const MAX_DAYS = 3;

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
    @InjectRepository(Attempt)
    private attemptRepository: Repository<Attempt>,
  ) {}

  async getProgress(userId: string, mode: ConversationMode) {
    let progress = await this.progressRepository.findOne({
      where: { user_id: userId, mode },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        user_id: userId,
        mode,
        current_day: 1,
        current_line: 1,
        completed_days_json: [],
      });
      await this.progressRepository.save(progress);
    }

    return progress;
  }

  async getAllProgress(userId: string) {
    const [normal, romantic] = await Promise.all([
      this.getProgress(userId, ConversationMode.NORMAL),
      this.getProgress(userId, ConversationMode.ROMANTIC),
    ]);

    const normalComplete = normal.completed_days_json.length >= MAX_DAYS;
    const romanticUnlocked = normalComplete;

    return {
      normal,
      romantic,
      romantic_unlocked: romanticUnlocked,
    };
  }

  /**
   * Records an attempt and updates the best score for this line.
   * Pass/fail is intentionally NOT decided here — each script line has
   * its own min_score (see ScriptLine), so the caller (the gateway)
   * is the single source of truth for whether an attempt passed.
   */
  async recordAttempt(
    userId: string,
    mode: ConversationMode,
    lineNumber: number,
    score: number,
  ): Promise<{ best_score: number; attempt_count: number }> {
    let attempt = await this.attemptRepository.findOne({
      where: { user_id: userId, mode, line_number: lineNumber },
    });

    if (!attempt) {
      attempt = this.attemptRepository.create({
        user_id: userId,
        mode,
        line_number: lineNumber,
        attempt_count: 0,
        best_score: 0,
      });
    }

    attempt.attempt_count += 1;
    if (score > attempt.best_score) attempt.best_score = score;
    await this.attemptRepository.save(attempt);

    return {
      best_score: attempt.best_score,
      attempt_count: attempt.attempt_count,
    };
  }

  async advanceLine(
    userId: string,
    mode: ConversationMode,
    totalLinesForDay: number,
  ) {
    const progress = await this.getProgress(userId, mode);

    if (progress.current_line < totalLinesForDay) {
      progress.current_line += 1;
    } else {
      // Day complete
      if (!progress.completed_days_json.includes(progress.current_day)) {
        progress.completed_days_json = [
          ...progress.completed_days_json,
          progress.current_day,
        ];
      }
      if (progress.current_day < MAX_DAYS) {
        progress.current_day += 1;
        progress.current_line = 1;
      }
    }

    await this.progressRepository.save(progress);
    return progress;
  }
}
