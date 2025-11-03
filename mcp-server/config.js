// Configuration for MCP server
// Add your actual Supabase keys here

export const config = {
  supabase: {
    url: 'https://ihheipfihcgtzhujcmdn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGVpcGZpaGNndHpodWpjbWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MzEsImV4cCI6MjA3NTM0MDQzMX0.wWNhyAYovdswvFlu1Qp8Gqp88YVnHKlY_5hwJzeV8TE',
    serviceRoleKey: 'YOUR_SERVICE_ROLE_KEY_HERE' // Replace with your actual service role key
  },
  server: {
    port: 3001
  }
};

