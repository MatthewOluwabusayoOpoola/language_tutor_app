import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { Progress } from '../entities/progress.entity';
import { Attempt } from '../entities/attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Progress, Attempt])],
  providers: [ProgressService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}
