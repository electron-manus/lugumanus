import type { ParsedResponseSuccess, TaskHistoryEntry } from 'src/types/browser-use.types';

/**
 * 检测重复操作
 */
export function detectRepeatedActions(history: TaskHistoryEntry[], threshold: number): boolean {
  if (history.length < threshold) {
    return false;
  }

  const recentActions = history.slice(-threshold);

  // 检查最近的操作是否都相同
  if (
    recentActions.length > 0 &&
    recentActions[0].action &&
    'parsedAction' in recentActions[0].action
  ) {
    const firstAction = recentActions[0].action as ParsedResponseSuccess;

    // 如果是滚动操作，不视为重复操作
    if (['scrollDown', 'scrollUp'].includes(firstAction.parsedAction.name)) {
      return false;
    }

    const allSameAction = recentActions.every((entry) => {
      if (!entry.action || !('parsedAction' in entry.action)) return false;
      const action = entry.action as ParsedResponseSuccess;

      // 检查操作名称是否相同
      if (action.parsedAction.name !== firstAction.parsedAction.name) return false;

      // 对于某些操作，还需要检查参数是否相同
      if (['click', 'type', 'select'].includes(action.parsedAction.name)) {
        // 检查元素ID是否相同
        if (action.parsedAction.args.elementId !== firstAction.parsedAction.args.elementId)
          return false;

        // 对于type操作，如果值不同则不算重复
        if (
          action.parsedAction.name === 'type' &&
          action.parsedAction.args.value !== firstAction.parsedAction.args.value
        ) {
          return false;
        }
      }

      return true;
    });
    return allSameAction;
  }

  return false;
}
