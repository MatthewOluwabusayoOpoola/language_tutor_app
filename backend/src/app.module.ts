import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProgressModule } from './progress/progress.module';
import { ScriptModule } from './scripts/script.module';
import { GatewayModule } from './gateway/gateway.module';
import { TtsModule } from './tts/tts.module';
import { SttModule } from './stt/stt.module';
import { ScoringModule } from './scoring/scoring.module';
import { User } from './entities/user.entity';
import { Progress } from './entities/progress.entity';
import { Attempt } from './entities/attempt.entity';
import { Country } from './entities/country.entity';
import { City } from './entities/city.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [User, Progress, Attempt, Country, City],
        synchronize: true, // disable in production; use migrations
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    ProgressModule,
    ScriptModule,
    GatewayModule,
    TtsModule,
    SttModule,
    ScoringModule,
  ],
})
export class AppModule {}
