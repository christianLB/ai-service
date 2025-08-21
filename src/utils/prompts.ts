export const createWorkflowPrompt = (description: string) =>
  `Create an n8n workflow JSON for the following description: ${description}`;
export const modifyWorkflowPrompt = (description: string) =>
  `Modify the existing n8n workflow based on: ${description}`;
