const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const { data: sessions } = await sb.from('chat_sessions').select('id, agent_id');
  if (!sessions) { console.log('no sessions'); return; }

  for (const session of sessions) {
    const { data: msgs } = await sb.from('chat_messages').select('*').eq('session_id', session.id).order('created_at');
    if (!msgs) continue;

    // trim 기반 콘텐츠 중복 제거 (같은 role + trimmed content → 첫 번째만 유지)
    const seen = new Map();
    const dupes = [];
    for (const m of msgs) {
      const key = m.role + '::' + (m.content || '').trim();
      if (seen.has(key)) {
        dupes.push(m.id);
      } else {
        seen.set(key, m.id);
      }
    }

    if (dupes.length > 0) {
      console.log(`Session ${session.agent_id}: ${msgs.length} msgs, ${dupes.length} duplicates`);
      for (const id of dupes) {
        await sb.from('chat_messages').delete().eq('id', id);
      }
      console.log(`  Deleted ${dupes.length} duplicates`);
    }
  }
  console.log('Done');
})();
