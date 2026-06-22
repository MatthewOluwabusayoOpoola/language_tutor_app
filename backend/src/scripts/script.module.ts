import { Module } from '@nestjs/common';
import { ScriptService } from './script.service';
import { ScriptController } from './script.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [ScriptService],
  controllers: [ScriptController],
  exports: [ScriptService],
})
export class ScriptModule {}
