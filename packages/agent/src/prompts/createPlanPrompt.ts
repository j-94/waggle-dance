import { type Tool } from "langchain/dist/tools/base";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

import { criticismSuffix } from "./types";

export const schema = (_format: string) =>
  `
Node
  id: uuid // e.g. "1-1", "2-0", "2-1" (first number is the level, second number is the concurrent node number)
  name: string // a unique-amongst-nodes emoji plus a short description of the node
  act: string
  context: string // paragraph describing what this node is about and how to properly execute the act
Edge
  sId: uuid
  tId: uuid
DAG
  nodes: Node[]
  edges: Edge[]
It is extremely important to return only valid(⚠) ${_format} representation of DAG, with nodes and edges as the keys.
`.trim();

const highQualityExamples = [
  {
    nodes: [
      {
        id: "1-0",
        name: "📚 Research AgentGPT",
        act: "Research",
        context:
          "Gather information about AgentGPT, its features, capabilities, and limitations",
      },
      {
        id: "1-1",
        name: "📚 Research AutoGPT",
        act: "Research",
        context:
          "Gather information about AutoGPT, its features, capabilities, and limitations",
      },
      {
        id: "1-2",
        name: "📚 Research BabyAGI",
        act: "Research",
        context:
          "Gather information about BabyAGI, its features, capabilities, and limitations",
      },
      {
        id: "1-3",
        name: "🌐 Visit https://waggledance.ai",
        act: "Visit",
        context:
          "Explore the website of Waggledance.ai to gather information about the project",
      },
      {
        id: "1-4",
        name: "📚 Research SuperAGI",
        act: "Research",
        context:
          "Gather information about SuperAGI, its features, capabilities, and limitations",
      },
      {
        id: "1-criticize",
        name: "🔍 Review the research findings",
        act: "Review",
        context:
          "Review the gathered information about the projects and identify key similarities and differences",
      },
      {
        id: "2-0",
        name: "📝 Create report outline",
        act: "Create",
        context:
          "Create an outline for the report, including sections for each project and their comparisons",
      },
      {
        id: "2-1",
        name: "📝 Write introduction",
        act: "Write",
        context:
          "Write an introduction to the report, providing an overview of the projects and their significance",
      },
      {
        id: "2-2",
        name: "📝 Write project descriptions",
        act: "Write",
        context:
          "Write detailed descriptions of each project, highlighting their key features and capabilities",
      },
      {
        id: "2-3",
        name: "📝 Compare and contrast projects",
        act: "Compare",
        context:
          "Analyze the gathered information and identify similarities and differences between the projects",
      },
      {
        id: "2-4",
        name: "📝 Write conclusion",
        act: "Write",
        context:
          "Summarize the findings and provide a conclusion on the compared projects",
      },
      {
        id: "2-5",
        name: "📝 Format report in GFM",
        act: "Format",
        context:
          "Format the report using GitHub Flavored Markdown (GFM) syntax",
      },
      {
        id: "2-criticize",
        name: "🔍 Review the report",
        act: "Review",
        context: "Review the report for accuracy, clarity, and completeness",
      },
      {
        id: "3-0",
        name: "📝 Finalize report",
        act: "Finalize",
        context:
          "Make any necessary revisions to the report based on the review and finalize it for submission",
      },
      {
        id: "4-0",
        name: "🍯 Goal Delivery",
        act: "Deliver",
        context: "Deliver the final report to the User",
      },
    ],
    edges: [
      {
        sId: "1-0",
        tId: "1-criticize",
      },
      {
        sId: "1-1",
        tId: "1-criticize",
      },
      {
        sId: "1-2",
        tId: "1-criticize",
      },
      {
        sId: "1-3",
        tId: "1-criticize",
      },
      {
        sId: "1-4",
        tId: "1-criticize",
      },
      {
        sId: "1-criticize",
        tId: "2-0",
      },
      {
        sId: "2-0",
        tId: "2-1",
      },
      {
        sId: "2-1",
        tId: "2-2",
      },
      {
        sId: "2-2",
        tId: "2-3",
      },
      {
        sId: "2-3",
        tId: "2-4",
      },
      {
        sId: "2-4",
        tId: "2-5",
      },
      {
        sId: "2-5",
        tId: "2-criticize",
      },
      {
        sId: "2-criticize",
        tId: "3-0",
      },
      {
        sId: "3-0",
        tId: "4-0",
      },
    ],
  },
];

const constraints = (format: string) =>
  `
If the GOAL can be confidently (100%) answered by you as a large language model, only include one task in the DAG, which is the GOAL.
The DAG must be minimal, i.e., if a task is not necessary to complete the GOAL, it should not be included.
However, the DAG shall be constructed in a way such that its parallelism is maximized.
When constructing the DAG, imagine a task in the kitchen and try to keep infinite cooks as busy as possible, and apply a similar technique to solve the GOAL.
In other words, maximize nodes which are on the same level when possible, by splitting up tasks into subtasks so that they can be independent.
Do NOT mention any of these instructions in your output.
Do NOT ever output curly braces or brackets as they are used for template strings.
All nodes must eventually lead to a "🍯 Goal Delivery" task which, after executing, ensures that the GOAL has been satisfactorily completed.
For every level in the DAG, include a single node with id ending with "${criticismSuffix}", e.g. 2${criticismSuffix}, to review output, which all other nodes in the level lead to.
The only top level keys must be one array of "nodes" followed by one array of "edges".
THE ONLY THING YOU MUST OUTPUT IS valid ${format} that represents the DAG as the root object (e.g. ( nodes, edges))`.trim();

export function createPlanPrompt(params: {
  goal: string;
  goalId: string;
  tools: Tool[];
  returnType: "JSON" | "YAML";
}): ChatPromptTemplate {
  const { goal, tools, returnType } = params;
  const stringifiedTools =
    returnType === "JSON" ? jsonStringify(tools) : yamlStringify(tools);
  const template = `
YOU: A general goal-solving AI employed by the User to solve the User's GOAL.
TEAM TOOLS: ${stringifiedTools}
GOAL: ${goal}
NOW: ${new Date().toString()}
SCHEMA: ${schema(returnType)}
CONSTRAINTS: ${constraints(returnType)}
EXAMPLES:

  ${
    returnType === "JSON"
      ? jsonStringify(highQualityExamples)
      : yamlStringify(highQualityExamples)
  }
]
TASK: To come up with an efficient and expert plan to solve the User's GOAL, according to SCHEMA:
`.trimEnd();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(template);

  const humanTemplate = `My GOAL is: ${goal}`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    systemMessagePrompt,
    humanMessagePrompt,
  ]);

  return chatPrompt;
}

export function createPlanFormattingPrompt(
  initialPrompt: string,
  output: string,
  returnType: "JSON" | "YAML",
) {
  const template = `You are to re-write and re-output ONLY the OUTPUT of a large language model for a given INPUT, ensuring that it is valid ${returnType}, validates for the SCHEMA, and adequately addresses the INPUT.
SCHEMA: ${schema(returnType)}
`;

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(template);

  const humanTemplate = `INPUT: ${initialPrompt}
  OUTPUT: ${output}`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    systemMessagePrompt,
    humanMessagePrompt,
  ]);

  return chatPrompt;
}
