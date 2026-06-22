import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { TtsService } from '../tts/tts.service';
import { SttService } from '../stt/stt.service';
import { ScoringService } from '../scoring/scoring.service';
import { ProgressService } from '../progress/progress.service';
import { ScriptService } from '../scripts/script.service';
import { UserService } from '../user/user.service';
import { ConversationMode } from '../entities/progress.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ConversationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private ttsService: TtsService,
    private sttService: SttService,
    private scoringService: ScoringService,
    private progressService: ProgressService,
    private scriptService: ScriptService,
    private userService: UserService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new Error('No token');
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      console.log(
        `[Socket] Client connected: ${client.id}, userId: ${client.userId}`,
      );
    } catch (err) {
      console.error(
        `[Socket] Connection failed for ${client.id}:`,
        err instanceof Error ? err.message : err,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('request-tts')
  async handleTts(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { text: string; slow: boolean },
  ) {
    // Server-side TTS disabled — instruct clients to use browser Web Speech API.
    client.emit('tts-error', {
      message:
        'Server-side TTS disabled. Use browser Web Speech API (speechSynthesis).',
    });
  }

  @SubscribeMessage('submit-transcript')
  async handleTranscript(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      transcript: string;
      mode: ConversationMode;
      day: number;
      line_number: number;
    },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return client.emit('error', { message: 'Unauthorized' });

      const profile = await this.userService.getProfile(userId);
      const scriptDay = this.scriptService.getDayCumulative(
        data.mode,
        data.day,
        {
          name: profile.name,
          turkish_nationality: profile.turkish_nationality,
          turkish_from: profile.turkish_from,
          turkish_city_locative: profile.turkish_city_locative,
        },
      );

      const line = scriptDay?.lines.find(
        (l) => l.line_number === data.line_number,
      );
      if (!line) return client.emit('error', { message: 'Line not found' });

      const transcript = data.transcript;

      // Score
      const rawScore = this.scoringService.score(
        transcript,
        line.expected_response,
      );
      const passed = rawScore >= line.min_score;

      // Record attempt
      const attemptResult = await this.progressService.recordAttempt(
        userId,
        data.mode,
        data.line_number,
        rawScore,
      );

      if (passed) {
        // Advance progress with cumulative total lines
        const totalLines = scriptDay!.lines.length;
        const updatedProgress = await this.progressService.advanceLine(
          userId,
          data.mode,
          totalLines,
        );

        client.emit('pronunciation-result', {
          passed: true,
          score: rawScore,
          transcript,
          expected: line.expected_response,
          attempt_count: attemptResult.attempt_count,
          progress: updatedProgress,
        });
      } else {
        client.emit('pronunciation-result', {
          passed: false,
          score: rawScore,
          transcript,
          expected: line.expected_response,
          correction_hint: line.correction_hint,
          mispronunciations: line.mispronunciations,
          attempt_count: attemptResult.attempt_count,
        });
      }
    } catch (err) {
      client.emit('error', {
        message: 'Processing failed',
        error: err.message,
      });
    }
  }

  @SubscribeMessage('audio-stream')
  async handleAudioStream(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      audio: string; // base64 encoded WebM/Opus
      mode: ConversationMode;
      day: number;
      line_number: number;
    },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return client.emit('error', { message: 'Unauthorized' });

      const profile = await this.userService.getProfile(userId);
      const scriptDay = this.scriptService.getDayCumulative(
        data.mode,
        data.day,
        {
          name: profile.name,
          turkish_nationality: profile.turkish_nationality,
          turkish_from: profile.turkish_from,
          turkish_city_locative: profile.turkish_city_locative,
        },
      );

      const line = scriptDay?.lines.find(
        (l) => l.line_number === data.line_number,
      );
      if (!line) return client.emit('error', { message: 'Line not found' });

      // Transcribe
      const audioBuffer = Buffer.from(data.audio, 'base64');
      const transcript = await this.sttService.transcribe(audioBuffer);

      // Score
      const rawScore = this.scoringService.score(
        transcript,
        line.expected_response,
      );
      const passed = rawScore >= line.min_score;

      // Record attempt
      const attemptResult = await this.progressService.recordAttempt(
        userId,
        data.mode,
        data.line_number,
        rawScore,
      );

      if (passed) {
        // Advance progress with cumulative total lines
        const totalLines = scriptDay!.lines.length;
        const updatedProgress = await this.progressService.advanceLine(
          userId,
          data.mode,
          totalLines,
        );

        client.emit('pronunciation-result', {
          passed: true,
          score: rawScore,
          transcript,
          expected: line.expected_response,
          attempt_count: attemptResult.attempt_count,
          progress: updatedProgress,
        });
      } else {
        client.emit('pronunciation-result', {
          passed: false,
          score: rawScore,
          transcript,
          expected: line.expected_response,
          correction_hint: line.correction_hint,
          mispronunciations: line.mispronunciations,
          attempt_count: attemptResult.attempt_count,
        });
      }
    } catch (err) {
      client.emit('error', {
        message: 'Processing failed',
        error: err.message,
      });
    }
  }
}
