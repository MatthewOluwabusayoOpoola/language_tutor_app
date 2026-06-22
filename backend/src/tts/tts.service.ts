import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TtsService implements OnModuleInit {
  // Server-side TTS disabled: using browser Web Speech API instead.
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    console.warn(
      'TtsService: server-side text-to-speech is disabled. Use browser Web Speech API.',
    );
  }

  async synthesize(_: string, __: boolean = false): Promise<Buffer> {
    throw new Error(
      'Server-side TTS disabled. Use browser Web Speech API (speechSynthesis).',
    );
  }
}
