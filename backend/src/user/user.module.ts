import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '../entities/user.entity';
import { Country } from '../entities/country.entity';
import { City } from '../entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Country, City])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
