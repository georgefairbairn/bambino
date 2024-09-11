import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

const VOICE_CONFIG: Record<string, { [k: string]: string }> = {
  'en-US': {
    MALE: 'en-US-Wavenet-D',
    FEMALE: 'en-US-Wavenet-E',
  },
  'en-GB': {
    MALE: 'en-GB-Wavenet-B',
    FEMALE: 'en-GB-Wavenet-A',
  },
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const text = url.searchParams.get('text');
  const locale = url.searchParams.get('locale');
  const voice = url.searchParams.get('voice');

  if (!text || !locale || !voice) {
    return json({ error: 'Missing params' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text: text },
          voice: {
            languageCode: locale,
            name: VOICE_CONFIG[locale][voice],
            ssmlGender: voice,
          },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Error synthesizing speech');
    }

    const data = await response.json();
    return json({ audioContent: data.audioContent });
  } catch (error) {
    console.error(error);
    return json({ error: 'Failed to synthesize speech' }, { status: 500 });
  }
};
