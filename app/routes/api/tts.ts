import { json, LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const text = url.searchParams.get('text');

  if (!text) {
    return json({ error: 'Text is required' }, { status: 400 });
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
          voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D' },
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
