// Secure AI Proxy - calls OpenAI API from backend to protect API keys
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://ihheipfihcgtzhujcmdn.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGVpcGZpaGNndHpodWpjbWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MzEsImV4cCI6MjA3NTM0MDQzMX0.wWNhyAYovdswvFlu1Qp8Gqp88YVnHKlY_5hwJzeV8TE'
);

interface AIRequest {
  message: string;
  tools?: any[];
}

interface AIResponse {
  success: boolean;
  result?: string;
  error?: string;
}

// Secure AI proxy that handles OpenAI calls on the backend
export class SecureAIProxy {
  async sendMessage(message: string): Promise<string> {
    try {
      // Call our secure backend endpoint
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AIResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'AI request failed');
      }

      return data.result || 'Task completed successfully!';
    } catch (error) {
      console.error('AI Proxy error:', error);
      throw error;
    }
  }
}
