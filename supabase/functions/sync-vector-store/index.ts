// Sync Vector Store Edge Function
// Syncs task data to OpenAI Vector Store for ChatGPT queries
// Can be triggered via cron or webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string;
  urgency: string;
  project_id: string | null;
  created_at: string;
  completed_date: string | null;
  follow_up_item: boolean;
  url1: string | null;
  url2: string | null;
  url3: string | null;
  project?: {
    name: string;
    description: string | null;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const vectorStoreId = Deno.env.get('OPENAI_VECTOR_STORE_ID');
    const assistantId = Deno.env.get('OPENAI_ASSISTANT_ID');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('[VectorSync] Starting vector store sync...');

    // Parse request body for optional filters
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { user_id, incremental = false, updated_since } = body;

    // Build query
    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects (
          name,
          description
        )
      `)
      .eq('status', 'Open');

    // Filter by user if specified
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // Incremental sync: only fetch recently updated tasks
    if (incremental && updated_since) {
      query = query.gte('updated_at', updated_since);
    }

    const { data: tasks, error: selectError } = await query;

    if (selectError) {
      throw selectError;
    }

    if (!tasks || tasks.length === 0) {
      console.log('[VectorSync] No tasks to sync.');
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          message: 'No tasks to sync.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[VectorSync] Found ${tasks.length} task(s) to sync`);

    // Convert tasks to documents for vector store
    const documents = tasks.map((task: Task) => {
      const projectName = task.project?.name || 'No Project';
      const description = task.description || 'No description';

      // Format the content for embedding
      const content = [
        `Task: ${task.title}`,
        `Description: ${description}`,
        `Priority: ${task.urgency}`,
        `Due Date: ${new Date(task.due_date).toLocaleDateString()}`,
        `Project: ${projectName}`,
        task.follow_up_item ? 'Follow-up item: Yes' : '',
      ].filter(Boolean).join('\n');

      return {
        id: task.id,
        content,
        metadata: {
          user_id: task.user_id,
          task_id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status,
          urgency: task.urgency,
          due_date: task.due_date,
          project_name: projectName,
          follow_up_item: task.follow_up_item,
          created_at: task.created_at,
        },
      };
    });

    console.log('[VectorSync] Prepared documents for OpenAI');

    // Upload to OpenAI Vector Store
    // Note: This is a simplified implementation
    // In production, you'd want to:
    // 1. Create/upload files to OpenAI
    // 2. Add files to vector store
    // 3. Handle batching for large datasets
    // 4. Implement incremental updates (delete old, add new)

    if (!vectorStoreId) {
      console.log('[VectorSync] No OPENAI_VECTOR_STORE_ID configured, skipping upload');
      console.log('[VectorSync] Documents prepared:', JSON.stringify(documents.slice(0, 2), null, 2));

      return new Response(
        JSON.stringify({
          success: true,
          synced: documents.length,
          message: 'Vector store ID not configured. Documents prepared but not uploaded.',
          sample_documents: documents.slice(0, 2),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Upload documents to OpenAI
    // Format as JSONL for OpenAI file upload
    const jsonl = documents.map(doc => JSON.stringify(doc)).join('\n');
    const blob = new Blob([jsonl], { type: 'application/jsonl' });

    // Create file in OpenAI
    const formData = new FormData();
    formData.append('file', blob, 'tasks.jsonl');
    formData.append('purpose', 'assistants');

    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Failed to upload file to OpenAI: ${error}`);
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;

    console.log(`[VectorSync] Uploaded file to OpenAI: ${fileId}`);

    // Add file to vector store
    const addToStoreResponse = await fetch(
      `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          file_id: fileId,
        }),
      }
    );

    if (!addToStoreResponse.ok) {
      const error = await addToStoreResponse.text();
      throw new Error(`Failed to add file to vector store: ${error}`);
    }

    console.log(`[VectorSync] Added file to vector store: ${vectorStoreId}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: documents.length,
        file_id: fileId,
        vector_store_id: vectorStoreId,
        message: `Successfully synced ${documents.length} task(s) to OpenAI vector store.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[VectorSync] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
