import { type AgentPacketType } from "../../..";
import { TaskStatus } from "../types/TaskStatus";

export const mapPacketTypeToStatus = (
  packetType: AgentPacketType | undefined,
): TaskStatus => {
  switch (packetType) {
    case "done":
    case "handleAgentEnd":
    case "handleChainEnd":
      return TaskStatus.done;
    case "error":
    case "handleLLMError":
    case "handleChainError":
    case "handleToolError":
    case "handleAgentError":
      return TaskStatus.error;
    case "working":
    case "t":
    case "handleLLMStart":
    case "handleChainStart":
    case "handleToolStart":
    case "handleAgentAction":
    case "handleRetrieverError":
    case "handleText":
    case "handleToolEnd":
    case "starting":
    case "handleLLMEnd":
    case "handleRetrieverStart":
    case "handleRetrieverEnd":
    case "handleChatModelEnd":
    case "handleChatModelStart":
      return TaskStatus.working;
    case "requestHumanInput":
      return TaskStatus.wait;
    case "handleChatModelEnd":
    case "handleChatModelStart":
    case "handleRetrieverEnd":
    case "handleRetrieverStart":
      return TaskStatus.working;
    case "idle":
    case undefined:
      return TaskStatus.idle;
  }
};
