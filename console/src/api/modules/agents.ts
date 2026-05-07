import { request } from "../request";
import { getApiUrl } from "../config";
import { buildAuthHeaders } from "../authHeaders";
import type {
  AgentListResponse,
  AgentProfileConfig,
  CreateAgentRequest,
  AgentProfileRef,
  AgentAvatarUploadResponse,
  ReorderAgentsResponse,
  AgentKnowledgeBaseListResponse,
  AgentKnowledgeConfigResponse,
  AgentKnowledgePreviewResponse,
} from "../types/agents";

// Multi-agent management API
export const agentsApi = {
  // List all agents
  listAgents: () => request<AgentListResponse>("/agents"),

  // Get agent details
  getAgent: (agentId: string) =>
    request<AgentProfileConfig>(`/agents/${agentId}`),

  listAgentKnowledgeBases: (agentId: string) =>
    request<AgentKnowledgeBaseListResponse>(
      `/agents/${agentId}/knowledge-bases`,
    ),

  getAgentKnowledgeBase: (agentId: string) =>
    request<AgentKnowledgeConfigResponse>(`/agents/${agentId}/knowledge-base`),

  updateAgentKnowledgeBase: (agentId: string, knowledgeIds: string[]) =>
    request<AgentKnowledgeConfigResponse>(`/agents/${agentId}/knowledge-base`, {
      method: "PUT",
      body: JSON.stringify({ knowledge_ids: knowledgeIds }),
    }),

  previewWorkspaceKnowledge: (workspaceDir: string) =>
    request<AgentKnowledgePreviewResponse>(
      `/agents/knowledge-preview?workspace_dir=${encodeURIComponent(workspaceDir)}`,
    ),

  // Create new agent
  createAgent: (agent: CreateAgentRequest) =>
    request<AgentProfileRef>("/agents", {
      method: "POST",
      body: JSON.stringify(agent),
    }),

  // Update agent configuration
  updateAgent: (agentId: string, agent: AgentProfileConfig) =>
    request<AgentProfileConfig>(`/agents/${agentId}`, {
      method: "PUT",
      body: JSON.stringify(agent),
    }),

  uploadAgentAvatar: async (
    agentId: string,
    file: File,
  ): Promise<AgentAvatarUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(getApiUrl(`/agents/${agentId}/avatar`), {
      method: "POST",
      headers: buildAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Avatar upload failed: ${response.status} ${response.statusText}${
          text ? ` - ${text}` : ""
        }`,
      );
    }

    return response.json();
  },

  // Delete agent
  deleteAgent: (agentId: string) =>
    request<{ success: boolean; agent_id: string }>(`/agents/${agentId}`, {
      method: "DELETE",
    }),

  // Persist ordered agent ids
  reorderAgents: (agentIds: string[]) =>
    request<ReorderAgentsResponse>("/agents/order", {
      method: "PUT",
      body: JSON.stringify({ agent_ids: agentIds }),
    }),

  // Toggle agent enabled state
  toggleAgentEnabled: (agentId: string, enabled: boolean) =>
    request<{ success: boolean; agent_id: string; enabled: boolean }>(
      `/agents/${agentId}/toggle`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      },
    ),
};
