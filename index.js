export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. GET QUESTIONS API
    if (path === '/api/questions' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          `SELECT q.*, u.name as author_name, u.avatar_url, u.is_dofollow, u.bio, u.website_url,
           (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answers_count
           FROM questions q LEFT JOIN users u ON q.user_id = u.id 
           ORDER BY q.created_at DESC LIMIT 50`
        ).all();
        return Response.json(results || []);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // 2. POST QUESTION API
    if (path === '/api/questions' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { user_id, title, body_html, tags } = body;
        await env.DB.prepare(
          `INSERT INTO questions (user_id, title, body_html, tags, likes) VALUES (?, ?, ?, ?, 0)`
        ).bind(user_id, title, body_html, tags || '').run();
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // 3. LIKE QUESTION API
    if (path === '/api/questions/like' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { question_id } = body;
        await env.DB.prepare(
          `UPDATE questions SET likes = COALESCE(likes,0) + 1 WHERE id = ?`
        ).bind(question_id).run();
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // 4. GET ANSWERS API
    if (path === '/api/answers' && request.method === 'GET') {
      try {
        const qid = url.searchParams.get('question_id');
        const { results } = await env.DB.prepare(
          `SELECT a.*, u.name as author_name, u.avatar_url
           FROM answers a LEFT JOIN users u ON a.user_id = u.id
           WHERE a.question_id = ? ORDER BY a.created_at ASC`
        ).bind(qid).all();
        return Response.json(results || []);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // 5. POST ANSWER API
    if (path === '/api/answers' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { question_id, user_id, body_text } = body;
        await env.DB.prepare(
          `INSERT INTO answers (question_id, user_id, body_text) VALUES (?, ?, ?)`
        ).bind(question_id, user_id, body_text).run();
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // 6. UPDATE USER PROFILE API
    if (path === '/api/user/update' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { id, name, avatar_url, bio, website_url, is_dofollow } = body;
        await env.DB.prepare(
          `INSERT INTO users (id, name, avatar_url, bio, website_url, is_dofollow)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, avatar_url=excluded.avatar_url, bio=excluded.bio,
           website_url=excluded.website_url, is_dofollow=excluded.is_dofollow`
        ).bind(id, name, avatar_url, bio, website_url, is_dofollow ? 1 : 0).run();
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // 7. LOAD FRONTEND UI FROM CDN (Fast & Lightweight)
    const response = await fetch('https://cdn.jsdelivr.net/gh/solangiwaqas077-oss/product-launch@main/ask_app.html');
    const html = await response.text();

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};


