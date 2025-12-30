const DEFAULT_BASE_URL = "http://localhost:3001";

/**
 * Convert a non-2xx fetch Response into a rich Error object.
 * Attempts to parse JSON error bodies from FastAPI.
 */
async function toApiError(response) {
  let detail = null;
  try {
    detail = await response.json();
  } catch {
    // ignore parsing errors
  }

  const message =
    (detail && (detail.detail || detail.message)) ||
    `Request failed with ${response.status} ${response.statusText}`;

  const err = new Error(
    typeof message === "string" ? message : JSON.stringify(message)
  );
  err.status = response.status;
  err.detail = detail;
  return err;
}

function getApiBaseUrl() {
  /**
   * Resolve API base URL from environment.
   *
   * Supported env vars:
   * - REACT_APP_API_BASE (preferred; per task instruction)
   * - REACT_APP_API_BASE_URL (backward compatible with existing .env.example)
   */
  const raw =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_API_BASE_URL ||
    DEFAULT_BASE_URL;

  // Normalize trailing slash so `${base}${path}` doesn't become `//tasks`.
  return raw.replace(/\/+$/, "");
}

async function request(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : null),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw await toApiError(res);
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

// PUBLIC_INTERFACE
export async function listTasks() {
  /** Fetch all tasks. Returns { tasks: Task[] } */
  return request("/tasks", { method: "GET" });
}

// PUBLIC_INTERFACE
export async function createTask(payload) {
  /** Create a task. payload: { title, description, status } */
  return request("/tasks", { method: "POST", body: JSON.stringify(payload) });
}

// PUBLIC_INTERFACE
export async function updateTask(id, payload) {
  /** Full update a task. payload: { title, description, status } */
  return request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

// PUBLIC_INTERFACE
export async function patchTask(id, payload) {
  /** Partial update a task. payload: any subset of { title, description, status } */
  return request(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// PUBLIC_INTERFACE
export async function deleteTask(id) {
  /** Delete a task by id. Returns null (204). */
  return request(`/tasks/${id}`, { method: "DELETE" });
}
