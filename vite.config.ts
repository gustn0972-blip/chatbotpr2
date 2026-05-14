import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'dev-api',
        configureServer(server) {
          server.middlewares.use('/api/chat', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method not allowed');
              return;
            }

            const apiKey = env.OPENAI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.end(
                'OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.',
              );
              return;
            }

            let body = '';
            req.on('data', (chunk: Buffer) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              void (async () => {
                try {
                  const { messages } = JSON.parse(body) as {
                    messages: unknown[];
                  };

                  const openaiRes = await fetch(
                    'https://api.openai.com/v1/chat/completions',
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                      },
                      body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages,
                        stream: true,
                      }),
                    },
                  );

                  if (!openaiRes.ok) {
                    res.statusCode = openaiRes.status;
                    res.end(await openaiRes.text());
                    return;
                  }

                  res.setHeader('Content-Type', 'text/event-stream');
                  res.setHeader('Cache-Control', 'no-cache');
                  res.setHeader('X-Accel-Buffering', 'no');

                  const reader = openaiRes.body!.getReader();
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                      res.end();
                      break;
                    }
                    res.write(value);
                  }
                } catch (err) {
                  if (!res.headersSent) {
                    res.statusCode = 500;
                    res.end(String(err));
                  }
                }
              })();
            });
          });
        },
      },
    ],
  };
});
