const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const prefix = process.argv[2];
if (!prefix) { console.log('Usage: node scripts/dedup-one.js <id-prefix>'); process.exit(1); }

(async () => {
  // Get all messages in the session to find by prefix
  const { data: sessions } = await sb.from('chat_sessions').select('id').eq('agent_id', 'vbot-telegram').order('created_at', { ascending: false }).limit(1);
  if (!sessions || sessions.length === 0) { console.log('No session'); return; }
  const { data: msgs } = await sb.from('chat_messages').select('id, content').eq('session_id', sessions[0].id);
  const match = msgs.find(m => m.id.startsWith(prefix));
  if (!match) { console.log('No match for', prefix); return; }
  console.log('Deleting:', match.id, JSON.stringify(match.content.slice(0, 60)));
  const { error } = await sb.from('chat_messages').delete().eq('id', match.id);
  if (error) console.error('Error:', error);
  else console.log('Deleted');
})();
