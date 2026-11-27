import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export function Support() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ['support-messages'],
    queryFn: () => api.get<any[]>('/support/messages'),
    refetchInterval: 3000,
  });

  const send = useMutation({
    mutationFn: (text: string) => api.post('/support/messages', { body: text }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-messages'] }); setBody(''); },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    send.mutate(body.trim());
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-sm text-muted">Chat with our support team</p>
      </div>

      <div className="flex-1 rounded-xl border border-line bg-surface flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!messages?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="text-muted" size={40} />
              <p className="mt-3 font-medium">No messages yet</p>
              <p className="text-sm text-muted">Send a message to start a conversation with support</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.sender === 'CUSTOMER';
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-brand text-white rounded-br-sm'
                      : msg.sender === 'BOT'
                      ? 'bg-canvas border border-line rounded-bl-sm'
                      : 'bg-blue-50 border border-blue-200 rounded-bl-sm'
                  }`}>
                    {!isMe && (
                      <p className={`text-xs font-medium mb-0.5 ${msg.sender === 'BOT' ? 'text-muted' : 'text-blue-600'}`}>
                        {msg.sender === 'BOT' ? 'Bot' : 'Support Agent'}
                      </p>
                    )}
                    <p className="text-sm">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-muted'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-line p-3 flex gap-2">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button type="submit" disabled={send.isPending || !body.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
