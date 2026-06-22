import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SttService implements OnModuleInit {
  // Server-side STT disabled: using browser Web Speech API instead.
  onModuleInit() {
    console.warn(
      'SttService: server-side speech-to-text is disabled. Use browser Web Speech API.',
    );
  }

  async transcribe(_: Buffer): Promise<string> {
    throw new Error(
      'Server-side STT disabled. Use browser Web Speech API (SpeechRecognition).',
    );
  }
}
