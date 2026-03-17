const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const agentId = process.argv[2] || 'vbot-telegram';
  const { data: sessions } = await sb.from('chat_sessions').select('id, created_at').eq('agent_id', agentId).order('created_at', { ascending: false });
  if (!sessions || sessions.length === 0) { console.log('no session for', agentId); return; }

  console.log('Sessions for', agentId + ':');
  for (const s of sessions) {
    const { data: msgs } = await sb.from('chat_messages').select('id, role, created_at, content').eq('session_id', s.id).order('created_at');
    console.log(`  Session ${s.id.slice(0,8)} (${s.created_at}) — ${msgs ? msgs.length : 0} msgs`);
    if (msgs) {
      for (const m of msgs) {
        console.log(`    ${m.id.slice(0,8)} ${m.role.padEnd(9)} ${m.created_at} ${JSON.stringify(m.content.slice(0,80))}`);
      }
    }
  }
})();
