'use client';

/**
 * CoachAgent Test Page - Dev Only
 * Simple smoke test page for manual WebSocket testing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

type Persona = 'supportive' | 'analytical' | 'intense' | 'recovery';

interface Message {
  id: string;
  type: string;
  timestamp: Date;
  data: unknown;
}

export function CoachTestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [persona, setPersona] = useState<Persona>('supportive');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((type: string, data: unknown) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date(),
    }]);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    // Note: agents package expects kebab-case of binding name
    const wsUrl = 'ws://localhost:5173/agents/coach-agent/test?userId=seed-user-001&tenantId=seed-tenant-001';

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      addMessage('system', 'WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addMessage(data.type || 'message', data);
        
        if (data.type === 'persona_updated') {
          setPersona(data.persona);
        }
      } catch {
        addMessage('raw', event.data);
      }
    };

    ws.onclose = (event) => {
      setConnectionStatus('disconnected');
      addMessage('system', `Disconnected: code=${event.code}, reason=${event.reason}`);
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      addMessage('error', error);
    };
  }, [addMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback(() => {
    if (!input.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    
    const payload = { type: 'chat', content: input };
    wsRef.current.send(JSON.stringify(payload));
    addMessage('sent', payload);
    setInput('');
  }, [input, addMessage]);

  const changePersona = useCallback((newPersona: Persona) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'set_persona',
      persona: newPersona,
    }));
  }, []);

  const sendToolCall = useCallback((tool: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'tool_call',
      tool,
      params: {},
      requestId: crypto.randomUUID(),
    }));
  }, []);

  const requestState = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'get_state' }));
  }, []);

  const requestHistory = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'get_history' }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-red-500',
  }[connectionStatus];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">CoachAgent Test Page</h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusColor}`} />
            <span className="text-sm capitalize">{connectionStatus}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
          {/* Connection buttons */}
          <div className="flex gap-2">
            <Button onClick={connect} disabled={connectionStatus === 'connected'}>
              Connect
            </Button>
            <Button onClick={disconnect} disabled={connectionStatus !== 'connected'} variant="destructive">
              Disconnect
            </Button>
          </div>

          {/* Persona selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Persona:</span>
            <Select value={persona} onValueChange={(v) => changePersona(v as Persona)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supportive">Supportive</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
                <SelectItem value="intense">Intense</SelectItem>
                <SelectItem value="recovery">Recovery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={requestState}>
              Get State
            </Button>
            <Button size="sm" variant="outline" onClick={requestHistory}>
              Get History
            </Button>
            <Button size="sm" variant="outline" onClick={() => sendToolCall('getACWR')}>
              Test getACWR
            </Button>
            <Button size="sm" variant="outline" onClick={() => sendToolCall('getWellness')}>
              Test getWellness
            </Button>
            <Button size="sm" variant="outline" onClick={clearMessages}>
              Clear
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 h-[400px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No messages yet</div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm p-2 rounded ${
                    msg.type === 'error'
                      ? 'bg-red-900/50 border border-red-700'
                      : msg.type === 'sent'
                      ? 'bg-blue-900/50 border border-blue-700'
                      : msg.type === 'system'
                      ? 'bg-gray-700/50 border border-gray-600'
                      : 'bg-gray-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs text-gray-400">{msg.type}</span>
                    <span className="text-xs text-gray-500">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all text-xs">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            disabled={connectionStatus !== 'connected'}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={connectionStatus !== 'connected'}>
            Send
          </Button>
        </div>

        {/* Info */}
        <div className="mt-4 text-xs text-gray-500">
          <p>WebSocket URL: ws://localhost:5173/agents/coach-agent/test?userId=seed-user-001&tenantId=seed-tenant-001</p>
        </div>
      </div>
    </div>
  );
}

// Dev-only wrapper
export default function CoachTestRoute() {
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Not Found</h1>
          <p className="text-gray-400">This page is only available in development mode.</p>
        </div>
      </div>
    );
  }
  
  return <CoachTestPage />;
}
