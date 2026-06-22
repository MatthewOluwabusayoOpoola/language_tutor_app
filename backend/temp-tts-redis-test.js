const path = require('path');
const Redis = require('ioredis');
const textToSpeech = require('@google-cloud/text-to-speech');

async function run() {
  console.log('cwd', process.cwd());
  console.log(
    'GOOGLE_APPLICATION_CREDENTIALS',
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    const pong = await redis.ping();
    console.log('redis ping', pong);
    redis.disconnect();
  } catch (err) {
    console.error('redis error', err && err.message);
  }

  try {
    const client = new textToSpeech.TextToSpeechClient();
    const [response] = await client.synthesizeSpeech({
      input: { text: 'Merhaba dünya' },
      voice: {
        languageCode: 'tr-TR',
        name: 'tr-TR-Wavenet-B',
        ssmlGender: 'FEMALE',
      },
      audioConfig: { audioEncoding: 'MP3' },
    });
    console.log(
      'tts success',
      typeof response.audioContent,
      response.audioContent?.length,
    );
  } catch (err) {
    console.error('tts error', err && err.message);
  }
}

run();
