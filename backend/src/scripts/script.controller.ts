import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ScriptService } from './script.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConversationMode } from '../entities/progress.entity';

@Controller('scripts')
@UseGuards(JwtAuthGuard)
export class ScriptController {
  constructor(
    private scriptService: ScriptService,
    private userService: UserService,
  ) {}

  @Get(':mode/day/:day')
  async getScript(
    @Request() req,
    @Param('mode') mode: ConversationMode,
    @Param('day') day: string,
  ) {
    const profile = await this.userService.getProfile(req.user.userId);

    // Get cumulative script (all lines from day 1 to requested day)
    const dayData = this.scriptService.getDayCumulative(mode, parseInt(day), {
      name: profile.name,
      turkish_nationality: profile.turkish_nationality,
      turkish_from: profile.turkish_from,
      turkish_city_locative: profile.turkish_city_locative,
    });

    if (!dayData)
      throw new NotFoundException(
        `Script not found for mode=${mode} day=${day}`,
      );
    return dayData;
  }
}
