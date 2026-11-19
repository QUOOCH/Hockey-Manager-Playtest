const ALLOWED_ORIGINS = new Set([
  "https://quooch.github.io"
]);

const HF_BASE = "https://microsoft-trellis-2.hf.space";
const MAX_DEBUG_BYTES = 2 * 1024 * 1024;

function json(data, status = 200, origin = null) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

async function fetchHf(path, token) {
  const url = HF_BASE + path;
  const headers = { "Accept": "application/json" };

  if (token) headers.Authorization = `Bearer ${token}`;

  let response = await fetch(url, {
    method: "GET",
    headers,
    redirect: "follow"
  });

  let authMode = token ? "token" : "anonymous";

  // Public Spaces may reject a token created for a different HF scope.
  // Retry anonymously only for authorization failures; never expose the token.
  if (token && (response.status === 401 || response.status === 403)) {
    response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      redirect: "follow"
    });
    authMode = "anonymous-fallback";
  }

  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_DEBUG_BYTES) {
    return {
      ok: false,
      status: response.status,
      authMode,
      error: "Hugging Face response exceeded the 2 MB diagnostic limit."
    };
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    data = { responsePreview: body.slice(0, 1200) };
  }

  return {
    ok: response.ok,
    status: response.status,
    authMode,
    data
  };
}

function summarizeConfig(config) {
  if (!config || typeof config !== "object") return config;

  const components = Array.isArray(config.components)
    ? config.components.map((item) => ({
        id: item.id,
        type: item.type,
        component_class: item.component_class,
        props: item.props,
        api_info: item.api_info
      }))
    : [];

  const dependencies = Array.isArray(config.dependencies)
    ? config.dependencies.map((item) => ({
        id: item.id,
        targets: item.targets,
        inputs: item.inputs,
        outputs: item.outputs,
        api_name: item.api_name,
        trigger: item.trigger
      }))
    : [];

  return {
    version: config.version,
    mode: config.mode,
    dev_mode: config.dev_mode,
    enable_queue: config.enable_queue,
    components,
    dependencies
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ ok: false, error: "Origin not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, { status: 204 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed." }, 405, origin);
    }

    if (url.pathname === "/health") {
      return json({
        ok: true,
        service: "PUCK IT! TRELLIS.2 proxy",
        worker: "little-morning-b296",
        tokenConfigured: Boolean(env.HF_TOKEN)
      }, 200, origin);
    }

    if (url.pathname === "/debug/config") {
      const result = await fetchHf("/config", env.HF_TOKEN);
      if (!result.ok) {
        return json({
          ok: false,
          upstreamStatus: result.status,
          authMode: result.authMode,
          error: "Could not read the Hugging Face Space config.",
          details: result.data
        }, 502, origin);
      }

      const data = url.searchParams.get("raw") === "1"
        ? result.data
        : summarizeConfig(result.data);

      return json({
        ok: true,
        upstreamStatus: result.status,
        authMode: result.authMode,
        data
      }, 200, origin);
    }

    if (url.pathname === "/debug/openapi") {
      const result = await fetchHf("/gradio_api/openapi.json", env.HF_TOKEN);
      if (!result.ok) {
        return json({
          ok: false,
          upstreamStatus: result.status,
          authMode: result.authMode,
          error: "Could not read the Gradio OpenAPI document.",
          details: result.data
        }, 502, origin);
      }
      return json({
        ok: true,
        upstreamStatus: result.status,
        authMode: result.authMode,
        data: result.data
      }, 200, origin);
    }

    return json({
      ok: false,
      error: "Not found.",
      available: ["/health", "/debug/config", "/debug/config?raw=1", "/debug/openapi"]
    }, 404, origin);
  }
};
