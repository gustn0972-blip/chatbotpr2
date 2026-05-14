export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function sendMessage(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('응답 본문이 없습니다.');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch {
        // SSE 파싱 오류 무시
      }
    }
  }

  onDone();
}
