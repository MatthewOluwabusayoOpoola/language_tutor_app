import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.userService.getProfile(req.user.userId);
  }

  @Get('countries')
  getCountries() {
    return this.userService.getCountries();
  }

  @Get('countries/:code/cities')
  getCities(@Param('code') code: string) {
    return this.userService.getCitiesByCountry(code);
  }
}
