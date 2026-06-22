import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('user')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @UseGuards(JwtAuthGuard)
  @Get('progress')
  getProgress(@Request() req) {
    return this.progressService.getAllProgress(req.user.userId);
  }
}
