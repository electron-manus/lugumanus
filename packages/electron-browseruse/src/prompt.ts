import { type ActionDefinition, availableActions, availableActionsByScreenshot } from './action';
import type { ParsedResponseSuccess, TaskHistoryEntry } from './types/browser-use.types';

// Extract common function for formatting action lists
function formatActionList(actions: ActionDefinition[]) {
  return actions
    .map((action, i) => {
      const args = action.args.map((arg) => `${arg.name}: ${arg.type}`).join(', ');
      return `${i + 1}. ${action.name}(${args}): ${action.description}`;
    })
    .join('\n');
}

// Format available DOM-based actions
const formattedActions = formatActionList(availableActions as ActionDefinition[]);

// Format available screenshot-based actions
const formattedScreenshotActions = formatActionList(
  availableActionsByScreenshot as ActionDefinition[],
);

// Shared list of blocker types
const commonBlockerTypes = `
If you encounter obstacles, please give me an identifyBlocker action.
Common blocker types include:
- "login": Requires user authentication
- "captcha": Contains CAPTCHA or human verification
- "access_restriction": Access denied or forbidden
- "paywall": Requires payment or subscription
- "geo_restriction": Content restricted by geographic location
- "popup": Intrusive pop-ups (ads, notifications, cookie consent)
- "browser_compatibility": Website incompatible with current browser
- "javascript_required": JavaScript must be enabled
- "device_restriction": Restricted to specific devices
- "anti_scraping": Anti-bot or anti-scraping measures detected
- "content_loading": Dynamic content loading issues
- "session_timeout": Session expired
- "site_maintenance": Website under maintenance or server error
- "age_verification": Age verification required
- "2fa": Two-factor authentication required
- "social_login": Only social media login allowed
- "forbidden": Access forbidden
- "manual_upload": Need to manually upload files
- "manual_download": Need to manually download files
`;

// Shared example format
const commonExamples = `
Example of reporting a blocker:

<Thought>I cannot proceed because the page requires login</Thought>
<Action>identifyBlocker("login", "Page requires user authentication to continue")</Action>

You must always include <Thought> and <Action> start/end tags, otherwise your response will be marked as invalid.
`;

// Shared page summary example
const commonPageSummaryExample = `<Information>Tesla's balance sheet reflects the company's financial position at different points in time, including key information on assets and liabilities as follows:
1. **Total Assets**: Shows a growth trend. 2023-12: $106.618 billion, 2024-03: $109.226 billion, 2024-06: $112.832 billion, 2024-09: $119.852 billion, 2024-12: $122.07 billion. Primarily composed of current assets and non-current assets, where current assets include cash and short-term investments, short-term receivables, inventory, etc.; non-current assets include plant and equipment net assets, intangible assets, etc.
</Information>`;

// Create DOM-based example
const domActionExample = `
<Thought>I should click the add to cart button</Thought>
<Action>click(223)</Action>
${commonPageSummaryExample}
`;

// Create screenshot-based example
const screenshotActionExample = `
<Thought>I should click the add to cart button</Thought>
<Action>clickByCoordinates(850, 120)</Action>
${commonPageSummaryExample}
`;

// Define browser automation assistant system prompt based on HTML DOM structure for automated operations
export const browserUseSystemMessage = `
You are a browser automation assistant.

You can use the following tools:

${formattedActions}

You will be given a task to perform and the current state of the DOM.
You will also be given previous actions that you have taken. 
You may retry a failed action up to one time.

If you encounter any obstacles preventing the task from being completed, please use the identifyBlocker action to report the problem.

${commonBlockerTypes}

This is an example of an operation and page information:
${domActionExample}

${commonExamples}
`;

// Define browser automation assistant system prompt based on HTML screenshots for automated operations
export const browserUseSystemMessageByScreenshot = `
You are a browser automation assistant based on screenshots.

You can use the following tools:

${formattedScreenshotActions}

You will receive a screenshot of the task to perform and the current browser webpage state. Your actions should be based on the current screenshot and should provide a page information based on the current screenshot. You will also receive your previous actions. You can retry failed actions once.

When analyzing screenshots, identify UI elements based on their visual appearance and location. Select clear coordinates within target elements.

If you encounter any obstacles preventing the task from being completed, please use the identifyBlocker action to report the problem.

${commonBlockerTypes}

This is an example of an operation and page information:
${screenshotActionExample}

${commonExamples}
`;

/**
 * Build DOM-based prompt
 */
export function formatPrompt(taskInstructions: string, previousActions: ParsedResponseSuccess[]) {
  let previousActionsString = '';

  if (previousActions.length > 0) {
    const serializedActions = previousActions
      .map(
        (action) =>
          `<Thought>${action.instruction}</Thought>\n<Action>${action.action}</Action>\n<Information>${action.information}</Information>`,
      )
      .join('\n\n');
    previousActionsString = `You have already taken the following actions: \n${serializedActions}\n\n`;
  }

  return `The user requests the following task:

<TASK>${taskInstructions}</TASK>

${previousActionsString}

Current time: ${new Date().toLocaleString()}

You will be thinking about the action like a human.
You should be good at searching.
When you browse an illegal webpage, you should try to report it.
When you have repeatedly carried out the action here but still failed to find the result, you should come up with a different train of thought instead of trying again and again.
  `;
}

/**
 * Build screenshot-based prompt
 */
export function formatPromptForScreenshot(
  taskInstructions: string,
  previousActions: ParsedResponseSuccess[],
  errorActions: TaskHistoryEntry[] = [],
): string {
  let previousActionsString = '';

  if (previousActions.length > 0) {
    const serializedActions = previousActions
      .map(
        (action) =>
          `<Thought>${action.instruction}</Thought>\n<Action>${action.action}</Action>\n<Information>${action.information}</Information>`,
      )
      .join('\n\n');
    previousActionsString = `You have already taken the following actions: \n${serializedActions}\n\n`;
  }

  let errorActionsString = '';

  if (errorActions.length > 0) {
    const serializedActions = errorActions
      .map(
        (action) =>
          `<Thought>${(action.action as ParsedResponseSuccess)?.instruction}</Thought>\n<Action>${
            (action.action as ParsedResponseSuccess).action
          }</Action>\n<Error>${action.error}</Error>`,
      )
      .join('\n\n');

    errorActionsString = `You have already taken the actions, but it is abnormal: \n${serializedActions}\n\n`;
  }

  return `The user requests the following task:
  
<TASK>${taskInstructions}</TASK>

When you have repeatedly carried out the action here but still failed to find the result, 
you should come up with a different train of thought instead of trying again and again.
You should be good at searching.
  
${previousActionsString}

${errorActionsString}
  
Current time: ${new Date().toLocaleString()}
Now you will recognize the screenshot and provide instruction and action
You will be thinking about the action like a human.
When you browse an illegal webpage, you should try to report it.
  `;
}

export function systemMessage(useScreenshot: boolean, webUrl?: string, webTitle?: string) {
  const prompt = useScreenshot ? browserUseSystemMessageByScreenshot : browserUseSystemMessage;
  const preSystemMessage = webUrl
    ? `Now you have opened the website: ${webUrl} ${webTitle ? `The title of the website is: ${webTitle}` : ''}`
    : '';

  return `${preSystemMessage}\n\n${prompt}`;
}
