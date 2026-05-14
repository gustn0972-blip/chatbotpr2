import { useState, useRef, useEffect } from 'react';
import { SYSTEM_PROMPT } from '../constants/systemPrompt';
import { sendMessage } from '../api/chat';
import type { Message } from '../api/chat';
import './Chatbot.css';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type SelectionStep = 'topic' | 'difficulty' | 'done';

const TOPICS = ['일상 회화', '비즈니스 영어', '공항/여행 영어', '토익/수능 필수 단어'];
const DIFFICULTIES = ['초급', '중급', '고급'];

export default function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('topic');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendUserMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    setMessages([...nextMessages, { role: 'assistant', content: '' }]);

    const apiMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...nextMessages,
    ];

    try {
      await sendMessage(
        apiMessages,
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
            return updated;
          });
        },
        () => setIsLoading(false)
      );
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        };
        return updated;
      });
      setIsLoading(false);
    }
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setSelectionStep('difficulty');
  };

  const handleDifficultySelect = (difficulty: string) => {
    setSelectionStep('done');
    const content = `주제: ${selectedTopic}\n난이도: ${difficulty}\n\n위 조건에 맞는 영어 단어 퀴즈를 시작해줘.`;
    sendUserMessage(content);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendUserMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage(input);
    }
  };

  return (
    <div className="chatbot">
      <header className="chatbot-header">
        <h1 className="chatbot-title">영어 단어 퀴즈 챗봇</h1>
        <p className="chatbot-subtitle">주제와 난이도를 선택하면 맞춤 단어 퀴즈를 시작합니다</p>
      </header>

      <div className="chatbot-messages">
        {messages.length === 0 && (
          <div className="chatbot-welcome">
            <p>아래에서 주제를 선택하거나 직접 입력해 퀴즈를 시작해보세요!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-bubble">
              {msg.role === 'assistant' && msg.content === '' && isLoading && i === messages.length - 1 ? (
                <span className="loading-dots">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input-area">
        {selectionStep === 'topic' && (
          <div className="selection-panel">
            <p className="selection-label">주제 선택</p>
            <div className="selection-buttons">
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  className="selection-btn"
                  onClick={() => handleTopicSelect(topic)}
                  disabled={isLoading}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectionStep === 'difficulty' && (
          <div className="selection-panel">
            <p className="selection-label">
              <span className="selected-topic">{selectedTopic}</span> — 난이도 선택
            </p>
            <div className="selection-buttons">
              {DIFFICULTIES.map((difficulty) => (
                <button
                  key={difficulty}
                  className="selection-btn"
                  onClick={() => handleDifficultySelect(difficulty)}
                  disabled={isLoading}
                >
                  {difficulty}
                </button>
              ))}
            </div>
            <button
              className="back-btn"
              onClick={() => {
                setSelectionStep('topic');
                setSelectedTopic(null);
              }}
            >
              ← 주제 다시 선택
            </button>
          </div>
        )}

        <form className="input-form" onSubmit={handleSubmit}>
          <textarea
            className="input-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectionStep === 'done'
                ? "'퀴즈 시작'을 입력하거나 자유롭게 질문해보세요..."
                : '직접 입력하거나 위에서 주제를 선택하세요...'
            }
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim() || isLoading}
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
