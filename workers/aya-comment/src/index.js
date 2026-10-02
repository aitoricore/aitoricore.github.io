const SITE_ORIGINS = new Set([
  "https://aitoricore.github.io",
  "http://localhost:1313",
]);
const MAX_BODY_BYTES = 24_000;
const MAX_COMMENT_LENGTH = 5_000;
const MAX_AUTHOR_LENGTH = 60;
const MAX_POST_TITLE_LENGTH = 240;
const MAX_PAGE_SIZE = 50;
const HOURLY_COMMENT_LIMIT = 5;

const jsonResponse = (payload, status, origin) => {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });

  if (origin && SITE_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }

  return new Response(JSON.stringify(payload), { status, headers });
};

const errorResponse = (message, status, origin) =>
  jsonResponse({ ok: false, error: message }, status, origin);

const normalizePostId = value => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;

  try {
    const url = new URL(value, "https://aitoricore.github.io");
    if (url.origin !== "https://aitoricore.github.io" || url.search || url.hash) return null;
    return url.pathname;
  } catch {
    return null;
  }
};

const encodeCursor = comment =>
  btoa(JSON.stringify({ createdAt: comment.created_at, id: comment.id }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const decodeCursor = value => {
  if (!value) return null;

  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
};

const hashClientIp = async (ip, salt) => {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
};

const listComments = async (request, env, origin) => {
  const url = new URL(request.url);
  const postId = normalizePostId(url.searchParams.get("postId"));
  if (!postId) return errorResponse("A valid postId is required.", 400, origin);

  const parentId = url.searchParams.get("parentId") || null;
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Math.max(1, Math.min(Number.isFinite(parsedLimit) ? parsedLimit : 20, MAX_PAGE_SIZE));
  const cursorValue = url.searchParams.get("cursor");
  const cursor = decodeCursor(cursorValue);
  if (cursorValue && !cursor) return errorResponse("Invalid cursor.", 400, origin);

  let sql = `SELECT id, post_id, post_title, parent_id, author, content, created_at
    FROM comments
    WHERE post_id = ? AND status = 'approved'`;
  const bindings = [postId];

  sql += parentId ? " AND parent_id = ?" : " AND parent_id IS NULL";
  if (parentId) bindings.push(parentId);

  if (cursor) {
    sql += " AND (created_at < ? OR (created_at = ? AND id < ?))";
    bindings.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }

  sql += " ORDER BY created_at DESC, id DESC LIMIT ?";
  bindings.push(limit + 1);

  const result = await env.DB.prepare(sql).bind(...bindings).all();
  const rows = result.results || [];
  const hasMore = rows.length > limit;
  const comments = rows.slice(0, limit).map(row => ({
    id: row.id,
    postId: row.post_id,
    postTitle: row.post_title,
    parentId: row.parent_id,
    author: row.author,
    content: row.content,
    createdAt: row.created_at,
  }));

  return jsonResponse({
    ok: true,
    postId,
    comments,
    nextCursor: hasMore ? encodeCursor(rows[limit - 1]) : null,
  }, 200, origin);
};

const submitComment = async (request, env, origin) => {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) return errorResponse("Request is too large.", 413, origin);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return errorResponse("Request is too large.", 413, origin);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse("Request body must be valid JSON.", 400, origin);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Request body must be a JSON object.", 400, origin);
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return jsonResponse({ ok: true, message: "Comment received for moderation." }, 202, origin);
  }

  const postId = normalizePostId(body.postId);
  const postTitle = typeof body.postTitle === "string" ? body.postTitle.trim() : "";
  const author = typeof body.author === "string" ? body.author.trim() || "匿名" : "匿名";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const parentId = typeof body.parentId === "string" && body.parentId.trim() ? body.parentId.trim() : null;

  if (!postId) return errorResponse("A valid postId is required.", 400, origin);
  if (!postTitle || postTitle.length > MAX_POST_TITLE_LENGTH) {
    return errorResponse(`postTitle must be 1-${MAX_POST_TITLE_LENGTH} characters.`, 400, origin);
  }
  if (author.length > MAX_AUTHOR_LENGTH) {
    return errorResponse(`author must be at most ${MAX_AUTHOR_LENGTH} characters.`, 400, origin);
  }
  if (!content || content.length > MAX_COMMENT_LENGTH) {
    return errorResponse(`content must be 1-${MAX_COMMENT_LENGTH} characters.`, 400, origin);
  }

  if (parentId) {
    const parent = await env.DB.prepare(
      "SELECT id FROM comments WHERE id = ? AND post_id = ? AND status = 'approved'",
    ).bind(parentId, postId).first();
    if (!parent) return errorResponse("The parent comment does not exist.", 400, origin);
  }

  if (!env.RATE_LIMIT_SALT) return errorResponse("Comment service is not configured.", 503, origin);

  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await hashClientIp(clientIp, env.RATE_LIMIT_SALT);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM comments WHERE ip_hash = ? AND created_at >= ?",
  ).bind(ipHash, hourAgo).first();
  if ((recent?.total || 0) >= HOURLY_COMMENT_LIMIT) {
    return errorResponse("Comment rate limit exceeded. Try again later.", 429, origin);
  }

  const comment = {
    id: crypto.randomUUID(),
    postId,
    postTitle: postTitle.slice(0, MAX_POST_TITLE_LENGTH),
    parentId,
    author,
    content,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  await env.DB.prepare(`
    INSERT INTO comments (id, post_id, post_title, parent_id, author, content, status, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(
    comment.id,
    comment.postId,
    comment.postTitle,
    comment.parentId,
    comment.author,
    comment.content,
    ipHash,
    comment.createdAt,
  ).run();

  return jsonResponse({
    ok: true,
    message: "评论已提交，审核后显示。",
    comment,
  }, 201, origin);
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (origin && !SITE_ORIGINS.has(origin)) return errorResponse("Origin is not allowed.", 403, null);
    if (request.method === "OPTIONS") {
      const response = jsonResponse({}, 200, origin);
      return new Response(null, { status: 204, headers: response.headers });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/comments") return errorResponse("Not found.", 404, origin);

    try {
      if (request.method === "GET") return await listComments(request, env, origin);
      if (request.method === "POST") return await submitComment(request, env, origin);
      return errorResponse("Method not allowed.", 405, origin);
    } catch {
      return errorResponse("Comment service failed.", 500, origin);
    }
  },
};