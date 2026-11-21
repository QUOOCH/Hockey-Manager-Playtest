const ALLOWED_ORIGINS = new Set([
  "https://quooch.github.io"
]);

const HF_BASE = "https://microsoft-trellis-2.hf.space";
const ALLOWED_API = new Set([
  "preprocess_image",
  "get_seed",
  "image_to_3d",
  "extract_glb",
  "start_session",
  "end_session"
]);

function corsHeaders(origin) {
  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data, status = 200, origin = null) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...corsHeaders(origin)
  };
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function upstreamResponse(response, origin) {
  const headers = new Headers();
  for (const key of ["content-type", "cache-control", "x-content-type-options"]) {
    const value = response.headers.get(key);
    if (value) headers.set(key, value);
  }
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value);
  }
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    headers
  });
}

async function fetchHf(path, token) {
  const headers = { "Accept": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(HF_BASE + path, { headers, redirect: "follow" });
  const body = await response.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    data = { responsePreview: body.slice(0, 500) };
  }
  return { ok: response.ok, status: response.status, data };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ ok: false, error: "Origin not allowed." }, 403, null);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "PUCK IT! TRELLIS.2 proxy",
        worker: "little-morning-b296",
        tokenConfigured: Boolean(env.HF_TOKEN),
        telemetryDatabaseConfigured: Boolean(env.MATCH_LOGS_DB)
      }, 200, origin);
    }

    if (url.pathname === "/telemetry/status" && request.method === "GET") {
      return json({
        ok: true,
        databaseConfigured: Boolean(env.MATCH_LOGS_DB)
      }, env.MATCH_LOGS_DB ? 200 : 503, origin);
    }

    if (url.pathname === "/telemetry/matches" && request.method === "GET") {
      if (!env.MATCH_LOGS_DB) {
        return json({ ok: false, error: "MATCH_LOGS_DB binding is not configured." }, 503, origin);
      }
      const requestedLimit = Number(url.searchParams.get("limit") || 3);
      const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(10, Math.floor(requestedLimit))) : 3;
      try {
        const result = await env.MATCH_LOGS_DB.prepare(
          "SELECT id, created_at, home_team, away_team, score, duration_seconds, payload FROM match_logs ORDER BY created_at DESC LIMIT ?"
        ).bind(limit).all();
        const matches = (result.results || []).map(row => {
          let payload = null;
          try { payload = JSON.parse(row.payload); } catch { /* retain metadata if an old row is malformed */ }
          return {
            id: row.id,
            createdAt: row.created_at,
            home: row.home_team,
            away: row.away_team,
            score: row.score,
            durationSeconds: row.duration_seconds,
            payload
          };
        });
        return json({ ok: true, count: matches.length, matches }, 200, origin);
      } catch (error) {
        return json({ ok: false, error: "Could not read match logs.", detail: String(error).slice(0, 300) }, 500, origin);
      }
    }

    if (url.pathname === "/telemetry/matches" && request.method === "POST") {
      if (!env.MATCH_LOGS_DB) {
        return json({ ok: false, error: "MATCH_LOGS_DB binding is not configured." }, 503, origin);
      }
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ ok: false, error: "Expected application/json." }, 415, origin);
      }
      const rawBody = await request.text();
      if (rawBody.length > 1_500_000) {
        return json({ ok: false, error: "Match log is too large (1.5 MB limit)." }, 413, origin);
      }
      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return json({ ok: false, error: "Invalid JSON match log." }, 400, origin);
      }
      const id = typeof payload?.id === "string" ? payload.id.slice(0, 100) : "";
      const matchData = payload?.match && typeof payload.match === "object" ? payload.match : {};
      const entries = Array.isArray(payload?.entries) ? payload.entries : null;
      if (!id || !entries || entries.length > 600) {
        return json({ ok: false, error: "Match log must include an id and no more than 600 entries." }, 400, origin);
      }
      const createdValue = typeof payload.createdAt === "string" ? Date.parse(payload.createdAt) : NaN;
      const createdAt = Number.isFinite(createdValue) ? new Date(createdValue).toISOString() : new Date().toISOString();
      const home = typeof matchData.home === "string" ? matchData.home.slice(0, 100) : null;
      const away = typeof matchData.away === "string" ? matchData.away.slice(0, 100) : null;
      const score = typeof matchData.score === "string" ? matchData.score.slice(0, 20) : null;
      const duration = Number.isFinite(Number(matchData.elapsed)) ? Math.max(0, Number(matchData.elapsed)) : 0;
      try {
        await env.MATCH_LOGS_DB.prepare(
          "INSERT INTO match_logs (id, created_at, home_team, away_team, score, duration_seconds, payload) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING"
        ).bind(id, createdAt, home, away, score, duration, JSON.stringify(payload)).run();
      } catch (error) {
        return json({ ok: false, error: "Could not store match log.", detail: String(error).slice(0, 300) }, 500, origin);
      }
      return json({ ok: true, stored: true, id, entries: entries.length }, 201, origin);
    }

    if (!env.HF_TOKEN && url.pathname.startsWith("/gradio_api/")) {
      return json({ ok: false, error: "HF_TOKEN is not configured." }, 503, origin);
    }

    // Proxy Gradio-generated files, such as the final GLB download.
    if (url.pathname.startsWith("/gradio_api/file=") && request.method === "GET") {
      let requestedPath;
      try {
        requestedPath = decodeURIComponent(url.pathname.slice("/gradio_api/file=".length));
      } catch {
        return json({ ok: false, error: "Invalid file path encoding." }, 400, origin);
      }
      if (!requestedPath.startsWith("/tmp/gradio/") && !requestedPath.startsWith("tmp/gradio/")) {
        return json({ ok: false, error: "File path is outside the Gradio temporary directory." }, 403, origin);
      }
      const safePath = requestedPath.split("/").map(segment => encodeURIComponent(segment)).join("/");
      const fileUrl = HF_BASE + "/gradio_api/file=" + safePath;
      const response = await fetch(fileUrl, {
        headers: { "Authorization": `Bearer ${env.HF_TOKEN}` },
        redirect: "follow"
      });
      return upstreamResponse(response, origin);
    }

    // Upload an image to Gradio. The browser sends multipart/form-data.
    if (url.pathname === "/gradio_api/upload" && request.method === "POST") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("multipart/form-data")) {
        return json({ ok: false, error: "Expected multipart/form-data." }, 415, origin);
      }
      const headers = new Headers({
        "Authorization": `Bearer ${env.HF_TOKEN}`,
        "Content-Type": contentType
      });
      const response = await fetch(HF_BASE + "/gradio_api/upload", {
        method: "POST",
        headers,
        body: request.body,
        redirect: "follow"
      });
      return upstreamResponse(response, origin);
    }

    // Start or poll a Gradio queued API event.
    const callMatch = url.pathname.match(/^\/gradio_api\/call\/(v2\/)?([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/);
    if (callMatch) {
      const apiPrefix = callMatch[1] || "";
      const apiName = callMatch[2];
      const eventId = callMatch[3] || null;
      if (!ALLOWED_API.has(apiName)) {
        return json({ ok: false, error: "API endpoint not allowed." }, 404, origin);
      }

      if (request.method === "POST" && !eventId) {
        const contentType = request.headers.get("Content-Type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          return json({ ok: false, error: "Expected application/json." }, 415, origin);
        }
        const body = await request.text();
        if (body.length > 40_000_000) {
          return json({ ok: false, error: "Request payload is too large (40 MB limit)." }, 413, origin);
        }
        let payload;
        try { payload = JSON.parse(body); } catch {
          return json({ ok: false, error: "Invalid JSON request body." }, 400, origin);
        }
        const config = await fetchHf("/config", env.HF_TOKEN);
        if (!config.ok) {
          return json({ ok: false, error: "Hugging Face Space config unavailable.", upstreamStatus: config.status }, 502, origin);
        }
        const dependencies = Array.isArray(config.data?.dependencies) ? config.data.dependencies : [];
        const dependencyIndex = dependencies.findIndex((item) => item.api_name === apiName);
        if (dependencyIndex < 0) {
          return json({ ok: false, error: "Gradio API endpoint not found in Space config.", apiName }, 404, origin);
        }
        const dependency = dependencies[dependencyIndex];
        const queuePayload = {
          ...payload,
          fn_index: typeof dependency.id === "number" ? dependency.id : dependencyIndex
        };
        const response = await fetch(HF_BASE + "/gradio_api/queue/join", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.HF_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-gradio-user": "api"
          },
          body: JSON.stringify(queuePayload),
          redirect: "follow"
        });
        return upstreamResponse(response, origin);
      }

      if (request.method === "GET" && eventId) {
        const sessionHash = url.searchParams.get("session_hash");
        if (!sessionHash) {
          return json({ ok: false, error: "session_hash is required for the Gradio queue stream." }, 400, origin);
        }
        const streamUrl = new URL(HF_BASE + "/gradio_api/queue/data");
        streamUrl.searchParams.set("session_hash", sessionHash);
        const response = await fetch(streamUrl.toString(), {
          headers: {
            "Authorization": `Bearer ${env.HF_TOKEN}`,
            "Accept": "text/event-stream",
            "x-gradio-user": "api"
          },
          redirect: "follow"
        });
        return upstreamResponse(response, origin);
      }

      return json({ ok: false, error: "Unsupported method for this API route." }, 405, origin);
    }

    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed." }, 405, origin);
    }

    if (url.pathname === "/debug/proxy-test" && request.method === "GET") {
      // A lightweight end-to-end check: create a Gradio session and poll its SSE result.
      const startResponse = await fetch(HF_BASE + "/gradio_api/call/start_session", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.HF_TOKEN}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ data: [] }),
        redirect: "follow"
      });
      const startText = await startResponse.text();
      let startData;
      try { startData = JSON.parse(startText); } catch { startData = { responsePreview: startText.slice(0, 500) }; }
      if (!startResponse.ok || !startData.event_id) {
        return json({
          ok: false,
          step: "start_session",
          upstreamStatus: startResponse.status,
          response: startData
        }, 502, origin);
      }

      const pollResponse = await fetch(
        HF_BASE + "/gradio_api/call/start_session/" + encodeURIComponent(startData.event_id),
        {
          headers: {
            "Authorization": `Bearer ${env.HF_TOKEN}`,
            "Accept": "text/event-stream"
          },
          redirect: "follow"
        }
      );
      const eventStream = await pollResponse.text();
      return json({
        ok: pollResponse.ok && eventStream.includes("event: complete"),
        step: "start_session",
        postStatus: startResponse.status,
        pollStatus: pollResponse.status,
        completed: eventStream.includes("event: complete"),
        eventPreview: eventStream.slice(0, 1200)
      }, pollResponse.ok ? 200 : 502, origin);
    }

    if (url.pathname === "/debug/config" || url.pathname === "/debug/schema") {
      const result = await fetchHf("/config", env.HF_TOKEN);
      if (!result.ok) {
        return json({
          ok: false,
          upstreamStatus: result.status,
          error: "Hugging Face Space config unavailable."
        }, 502, origin);
      }

      const dependencies = Array.isArray(result.data?.dependencies) ? result.data.dependencies : [];
      const endpoints = dependencies.filter((item) => item.api_name);
      if (url.pathname === "/debug/config") {
        return json({
          ok: true,
          space: "microsoft/TRELLIS.2",
          status: "reachable",
          authMode: "token",
          componentCount: Array.isArray(result.data?.components) ? result.data.components.length : 0,
          apiEndpoints: [...new Set(endpoints.map((item) => item.api_name))]
        }, 200, origin);
      }

      const components = Array.isArray(result.data?.components) ? result.data.components : [];
      const byId = new Map(components.map((item) => [item.id, item]));
      const describe = (ids) => (Array.isArray(ids) ? ids : []).map((id) => {
        const item = byId.get(id) || {};
        const props = item.props || {};
        return {
          id,
          type: item.type || item.component_class || null,
          label: props.label ?? null,
          value: props.value ?? null,
          file_types: props.file_types ?? null,
          sources: props.sources ?? null,
          format: props.format ?? null
        };
      });
      return json({
        ok: true,
        authMode: "token",
        protocol: result.data?.protocol ?? null,
        apiPrefix: result.data?.api_prefix ?? null,
        endpoints: endpoints.map((item, index) => ({
          id: item.id ?? index,
          api_name: item.api_name,
          queue: item.queue ?? null,
          inputs: describe(item.inputs),
          outputs: describe(item.outputs)
        }))
      }, 200, origin);
    }

    if (url.pathname === "/debug/openapi") {
      const result = await fetchHf("/gradio_api/openapi.json", env.HF_TOKEN);
      if (!result.ok) {
        return json({
          ok: false,
          upstreamStatus: result.status,
          error: "Gradio OpenAPI unavailable."
        }, 502, origin);
      }
      return json({
        ok: true,
        endpoints: Object.keys(result.data?.paths || {})
      }, 200, origin);
    }

    return json({
      ok: false,
      error: "Not found.",
      available: ["/health", "/debug/config", "/debug/schema", "/debug/openapi", "/gradio_api/upload", "/gradio_api/call/{api_name}"]
    }, 404, origin);
  }
};
