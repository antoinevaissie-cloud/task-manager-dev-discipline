// Daily Rollover Edge Function
// Moves overdue open tasks to today's date
// Scheduled to run daily at 2 AM UTC via pg_cron

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

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    console.log(`[Rollover] Starting rollover job at ${now.toISOString()}`);
    console.log(`[Rollover] Today's date: ${today}`);

    // Find all overdue open tasks
    const { data: overdueTasks, error: selectError } = await supabase
      .from('tasks')
      .select('id, user_id, title, due_date')
      .eq('status', 'Open')
      .lt('due_date', today);

    if (selectError) {
      throw selectError;
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      console.log('[Rollover] No overdue tasks found.');
      return new Response(
        JSON.stringify({
          success: true,
          updated: 0,
          message: 'No overdue tasks found.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[Rollover] Found ${overdueTasks.length} overdue task(s)`);

    // Update overdue tasks to today
    const { data: updatedTasks, error: updateError } = await supabase
      .from('tasks')
      .update({ due_date: today })
      .eq('status', 'Open')
      .lt('due_date', today)
      .select();

    if (updateError) {
      throw updateError;
    }

    console.log(`[Rollover] Successfully updated ${updatedTasks?.length || 0} task(s)`);

    // Log each updated task (useful for debugging)
    updatedTasks?.forEach((task) => {
      console.log(`[Rollover] Updated task: ${task.id} - "${task.title}"`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedTasks?.length || 0,
        tasks: updatedTasks?.map(t => ({ id: t.id, title: t.title })),
        message: `Successfully rolled over ${updatedTasks?.length || 0} task(s) to today.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Rollover] Error:', error);
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

