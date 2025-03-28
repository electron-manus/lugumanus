import { availableActions, availableActionsByScreenshot } from '../action';
import type { ParsedResponse } from '../types/browser-use.types';

/**
 * 解析模型响应
 */
export function parseAiResponse(response: string, isScreenshot: boolean): ParsedResponse {
  const thoughtMatch = response.match(/<Thought>(.*?)<\/Thought>/s);
  const actionMatch = response.match(/<Action>(.*?)<\/Action>/s);
  const informationMatch = response.match(/<Information>(.*?)<\/Information>/s);
  const errorMatch = response.match(/<Error>(.*?)<\/Error>/s);

  if (!thoughtMatch) {
    return {
      error: `Invalid response: Instruction not found in the model response. ${response}`,
    };
  }

  if (!actionMatch) {
    return {
      error: `Invalid response: Action not found in the model response. ${response}`,
    };
  }

  const instruction = thoughtMatch[1];
  const actionString = actionMatch[1];
  const information = informationMatch ? informationMatch[1] : '';
  const error = errorMatch ? errorMatch[1] : undefined;

  const actionPattern = /(\w+)\((.*?)\)/;
  const actionParts = actionString.match(actionPattern);
  if (!actionParts) {
    return {
      error: `Invalid action format: Action should be in the format functionName(arg1, arg2, ...). ${response}`,
    };
  }

  const actionName = actionParts[1];
  const actionArgsString = actionParts[2];
  const availableAction = [...availableActionsByScreenshot, ...availableActions].find(
    (act) => act.name === actionName,
  );

  if (!availableAction) {
    return {
      error: `Invalid action: "${actionName}" is not a valid action. isScreenshot: ${isScreenshot}`,
    };
  }

  const argsArray = actionArgsString
    .split(',')
    .map((arg: string) => arg.trim())
    .filter((arg: string) => arg !== '');

  const parsedArgs: Record<string, number | string> = {};
  // 忽略参数
  const actionsArgsWhiteList = ['scrollDown', 'scrollUp', 'finish', 'fail', 'restart'];

  if (
    argsArray.length !== availableAction.args.length &&
    !actionsArgsWhiteList.includes(availableAction.name)
  ) {
    return {
      error: `Invalid number of arguments: Expected ${availableAction.args.length} for action "${actionName}", but got ${argsArray.length}.`,
    };
  }

  if (!actionsArgsWhiteList.includes(availableAction.name)) {
    for (let i = 0; i < argsArray.length; i++) {
      const arg = argsArray[i];
      const expectedArg = availableAction.args[i];

      if (expectedArg.type === 'number') {
        const numberValue = Number(arg);
        if (Number.isNaN(numberValue)) {
          return {
            error: `Invalid argument type: Expected a number for argument "${expectedArg.name}", but got "${arg}".`,
          };
        }

        parsedArgs[expectedArg.name] = numberValue;
      } else if (expectedArg.type === 'string') {
        const stringValue =
          (arg.startsWith('"') && arg.endsWith('"')) ||
          (arg.startsWith("'") && arg.endsWith("'")) ||
          (arg.startsWith('`') && arg.endsWith('`'))
            ? arg.slice(1, -1)
            : null;

        if (stringValue === null) {
          return {
            error: `Invalid argument type: Expected a string for argument "${JSON.stringify(expectedArg)}", but got "${arg}" ${argsArray}.`,
          };
        }

        parsedArgs[expectedArg.name] = stringValue;
      } else {
        return {
          error: `Invalid argument type: Unknown type "${expectedArg.type}" for argument "${expectedArg.name}".`,
        };
      }
    }
  }

  const parsedAction = {
    name: availableAction.name,
    args: parsedArgs,
  };

  if (error) {
    return {
      error,
    };
  }

  return {
    information: information,
    instruction,
    action: actionString,
    parsedAction,
  };
}
