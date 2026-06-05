/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// We default to port 7777 since Swagger documentation indicates the backend runs there.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:7777";

export interface User {
  user_id: string;
  name: string;
  created_at: string;
}

export interface Project {
  project_id: string;
  user_id: string;
  project_name: string;
  project_desc: string | null;
  created_at: string;
  updated_at: string;
  metadata: string | null;
}

export interface ColumnDef {
  id: string;
  name: string;
  type: "INTEGER" | "TEXT" | "REAL" | "BLOB" | "BOOLEAN" | "DATETIME" | string;
  pk: boolean;
  nullable: boolean;
  unique: boolean;
  default: any;
}

export interface TableDef {
  id: string;
  name: string;
  columns: ColumnDef[];
}

export interface RelationshipDef {
  id: string;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
}

export interface SchemaData {
  tables: TableDef[];
  relationships: RelationshipDef[];
}

export interface SchemaRead {
  project_id: string;
  schema_data: SchemaData;
  updated_at: string;
}

export interface AgentRun {
  run_id: string;
  status: string;
  run_input: string;
  content: string;
  created_at: string;
}

class SynthosApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return null as unknown as T;
      }

      if (!response.ok) {
        let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMessage = errData.detail;
          }
        } catch {
          // Fallback if not JSON
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error(`Synthos API request failed on ${url}:`, error);
      throw error;
    }
  }

  // --- Users ---

  async registerUser(name: string): Promise<User> {
    return this.request<User>("/synthos/users", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/synthos/users/${userId}`);
  }

  // --- Projects ---

  async createProject(
    userId: string,
    name: string,
    desc?: string,
    metadata?: string | null
  ): Promise<Project> {
    return this.request<Project>("/synthos/projects", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        project_name: name,
        project_desc: desc || "",
        metadata: metadata || null,
      }),
    });
  }

  async listProjects(userId: string): Promise<Project[]> {
    return this.request<Project[]>(`/synthos/users/${userId}/projects`);
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(`/synthos/projects/${projectId}`);
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.request<void>(`/synthos/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  // --- Schema ---

  async getSchema(projectId: string): Promise<SchemaRead> {
    return this.request<SchemaRead>(`/synthos/projects/${projectId}/schema`);
  }

  async updateSchema(projectId: string, schemaData: SchemaData): Promise<SchemaRead> {
    return this.request<SchemaRead>(`/synthos/projects/${projectId}/schema`, {
      method: "PUT",
      body: JSON.stringify({ schema_data: schemaData }),
    });
  }

  async patchSchema(projectId: string, ops: any[]): Promise<SchemaRead> {
    return this.request<SchemaRead>(`/synthos/projects/${projectId}/schema`, {
      method: "PATCH",
      body: JSON.stringify({ ops }),
    });
  }

  // Cached once per page load — db_id never changes for a deployed agent
  private _agentDbId: string | null = null;

  async getAgentDbId(): Promise<string> {
    if (this._agentDbId) return this._agentDbId;
    const agents = await this.request<any[]>("/agents");
    const agent = agents.find((a: any) => a.id === "synthos-schema-agent");
    if (!agent) throw new Error("synthos-schema-agent not found in /agents");
    this._agentDbId = agent.db_id as string;
    return this._agentDbId;
  }

  // Returns [] on 404 (no chat yet) — callers treat that as empty history.
  async getSessionRuns(projectId: string): Promise<AgentRun[]> {
    const dbId = await this.getAgentDbId();
    try {
      return await this.request<AgentRun[]>(
        `/sessions/${encodeURIComponent(projectId)}/runs?type=agent&db_id=${encodeURIComponent(dbId)}`
      );
    } catch (err: any) {
      if (/404|not found/i.test(err.message ?? "")) return [];
      throw err;
    }
  }

  openSchemaStream(projectId: string): EventSource {
    return new EventSource(`${BASE_URL}/synthos/projects/${projectId}/schema/stream`);
  }

  // Streams an agent run, calling onDelta for each text token and onEvent for all SSE events.
  // Resolves when the stream ends, rejects on network/HTTP errors.
  async streamAgentRun(
    message: string,
    sessionId: string,
    callbacks: {
      onDelta: (text: string) => void;
      onEvent: (name: string, data: any) => void;
    },
    signal?: AbortSignal
  ): Promise<void> {
    const form = new FormData();
    form.append("message", message);
    form.append("session_id", sessionId);
    form.append("stream", "true");

    const resp = await fetch(
      `${BASE_URL}/agents/synthos-schema-agent/runs?session_id=${encodeURIComponent(sessionId)}`,
      { method: "POST", body: form, signal }
    );

    if (!resp.ok) {
      let detail = `${resp.status} ${resp.statusText}`;
      try { detail = ((await resp.json()) as any).detail ?? detail; } catch {}
      throw new Error(detail);
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE blocks are separated by double newlines
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop()!;

      for (const block of blocks) {
        let eventName = "message";
        let dataLine = "";
        for (const line of block.split("\n")) {
          if (line.startsWith("event: ")) eventName = line.slice(7).trim();
          else if (line.startsWith("data: ")) dataLine = line.slice(6);
        }
        if (!dataLine) continue;
        try {
          const data = JSON.parse(dataLine);
          callbacks.onEvent(eventName, data);
          if (eventName === "RunContent" && data.content) {
            callbacks.onDelta(data.content);
          }
        } catch { /* ignore malformed */ }
      }
    }
  }
}

export const synthosApi = new SynthosApiClient();
