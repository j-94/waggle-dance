import {
  type AgentPacket,
  type AgentSettingsMap,
  type DAGNode,
} from "@acme/agent";

import executeTask from "../utils/executeTask";
import type DAG from "./DAG";
import { type DAGNodeClass } from "./DAG";
import { mapAgentSettingsToCreationProps } from "./types";

type LogType = (...args: (string | number | object)[]) => void;
export type InjectAgentPacketType = (
  agentPacket: AgentPacket,
  node: DAGNode | DAGNodeClass,
) => void;
type ResolveFirstTaskType = (
  value?: AgentPacket | PromiseLike<AgentPacket>,
) => void;
type RejectFirstTaskType = (reason?: string | Error) => void;

class TaskExecutor {
  constructor(
    private agentSettings: AgentSettingsMap,
    private goal: string,
    private goalId: string,
    private executionId: string,
    private completedTasks: Set<string>,
    private abortController: AbortController,
    private injectAgentPacket: InjectAgentPacketType,
    private log: LogType,
    private resolveFirstTask: ResolveFirstTaskType,
    private rejectFirstTask: RejectFirstTaskType,
  ) {}
  async startFirstTask(task: DAGNode | DAGNodeClass, dag: DAG): Promise<void> {
    this.log(
      "speed optimization: we are able to execute the first task while still planning.",
    );
    this.completedTasks.add(task.id);

    if (!this.abortController.signal.aborted) {
      try {
        const creationProps = mapAgentSettingsToCreationProps(
          this.agentSettings["execute"],
        );
        const executeRequest = {
          goal: this.goal,
          goalId: this.goalId,
          executionId: this.executionId,
          agentPromptingMethod:
            this.agentSettings["execute"].agentPromptingMethod!,
          task,
          dag,
          revieweeTaskResults: null, // intentionally left blank, first task can't be criticism
          completedTasks: this.completedTasks,
          creationProps,
        };
        const result = await executeTask({
          request: executeRequest,
          injectAgentPacket: this.injectAgentPacket,
          log: this.log,
          abortSignal: this.abortController.signal,
        });

        this.resolveFirstTask(result);

        this.injectAgentPacket(result, task);

        // const taskState = new TaskState({
        //   ...task,
        //   nodeId: task.id,
        //   value: result,
        //   packets: [result],
        //   updatedAt: new Date(),
        // });
        // this.taskResultsState[0][task.id] = taskState;
      } catch (error) {
        const message = (error as Error).message;
        this.injectAgentPacket(
          {
            type: "error",
            severity: "warn",
            message,
          },
          task,
        );
        this.rejectFirstTask(message);
        this.abortController.abort();
      }
    } else {
      console.warn("aborted startFirstTask");
      this.rejectFirstTask("Signal aborted");
      this.abortController.abort();
    }
  }
}

export default TaskExecutor;