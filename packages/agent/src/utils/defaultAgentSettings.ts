import { AgentPromptingMethod, LLM_ALIASES, Temperature } from "./llms";

export const defaultAgentSettings = {
  plan: {
    modelName: LLM_ALIASES["fast"],
    temperature: Temperature.Stable,
    maxTokens: 700,
    agentPromptingMethod: null,
    maxConcurrency: 2,
  },
  review: {
    modelName: LLM_ALIASES["fast"],
    temperature: Temperature.Stable,
    maxTokens: 350,
    agentPromptingMethod: AgentPromptingMethod.ZeroShotReAct,
    maxConcurrency: 4,
  },
  execute: {
    modelName: LLM_ALIASES["fast-large"],
    temperature: Temperature.Stable,
    maxTokens: 2000,
    agentPromptingMethod: AgentPromptingMethod.ChatConversationalReAct,
    maxConcurrency: 6,
  },
};

export default defaultAgentSettings;