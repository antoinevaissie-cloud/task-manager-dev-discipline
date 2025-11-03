// Public endpoint to get tasks (for Custom GPT)
// This bypasses RLS by using service role

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (bypasses RLS)
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

    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'Open';
    const urgency = url.searchParams.get('urgency');
    const dueDate = url.searchParams.get('due_date');

    // Build query
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        urgency,
        due_date,
        created_at
      `)
      .eq('status', status)
      .order('due_date', { ascending: true })
      .order('urgency', { ascending: true });

    // Apply filters
    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    if (dueDate) {
      query = query.eq('due_date', dueDate);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify(tasks || []),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

