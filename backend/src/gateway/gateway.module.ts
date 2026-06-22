import { Module } from '@nestjs/common';
import { ConversationGateway } from './conversation.gateway';
import { TtsModule } from '../tts/tts.module';
import { SttModule } from '../stt/stt.module';
import { ScoringModule } from '../scoring/scoring.module';
import { ProgressModule } from '../progress/progress.module';
import { ScriptModule } from '../scripts/script.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TtsModule, SttModule, ScoringModule, ProgressModule, ScriptModule, UserModule, AuthModule],
  providers: [ConversationGateway],
})
export class GatewayModule {}
