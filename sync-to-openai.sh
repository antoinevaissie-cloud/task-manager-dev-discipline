#!/bin/bash

# Script to manually sync tasks to OpenAI Vector Store

echo "🔄 Syncing tasks to OpenAI Vector Store..."

curl -X POST 'https://ihheipfihcgtzhujcmdn.supabase.co/functions/v1/sync-vector-store' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGVpcGZpaGNndHpodWpjbWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MzEsImV4cCI6MjA3NTM0MDQzMX0.wWNhyAYovdswvFlu1Qp8Gqp88YVnHKlY_5hwJzeV8TE" \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo "✅ Sync complete! You can now query your tasks in ChatGPT."
echo ""
echo "Try asking:"
echo "  - List my tasks for today"
echo "  - Show me all P1 tasks"
echo "  - What's due this week?"

