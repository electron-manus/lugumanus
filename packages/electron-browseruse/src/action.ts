// 定义操作参数类型
type ActionArgType = 'string' | 'number' | 'boolean';

// 定义操作参数结构
interface ActionArg {
  name: string;
  type: ActionArgType;
  description?: string; // 添加可选的参数描述
}

// 定义基础操作接口
interface ActionDefinition {
  name: string;
  description: string;
  args: ActionArg[];
}

// 常见操作参数预定义
const ELEMENT_ID_ARG: ActionArg = {
  name: 'elementId',
  type: 'number',
  description: 'ID of element to operate on',
};

const COORDINATE_ARGS: ActionArg[] = [
  {
    name: 'x',
    type: 'number',
    description: 'X coordinate position',
  },
  {
    name: 'y',
    type: 'number',
    description: 'Y coordinate position',
  },
];

// 定义基础操作集合
const baseActions: ActionDefinition[] = [
  {
    name: 'back',
    description: 'Back to previous page',
    args: [],
  },
  {
    name: 'restart',
    description: 'Restart task',
    args: [],
  },
  {
    name: 'scrollDown',
    description: 'Scroll page down',
    args: [],
  },
  {
    name: 'scrollUp',
    description: 'Scroll page up',
    args: [],
  },
  {
    name: 'finish',
    description: 'Indicate task is completed',
    args: [],
  },
  {
    name: 'fail',
    description: 'Indicate task cannot be completed',
    args: [],
  },
  {
    name: 'identifyBlocker',
    description:
      'Identify and report obstacles preventing task completion, such as login requirements, captchas, access restrictions, etc.',
    args: [
      {
        name: 'blockerType',
        type: 'string',
        description: 'Blocker type',
      },
      {
        name: 'description',
        type: 'string',
        description: 'Detailed blocker description',
      },
    ],
  },
];

// 基于元素ID的特定操作
const elementBasedActions: ActionDefinition[] = [
  {
    name: 'click',
    description: 'Click on specified element',
    args: [ELEMENT_ID_ARG],
  },
  {
    name: 'setValue',
    description: 'Focus and set value of input element',
    args: [
      ELEMENT_ID_ARG,
      {
        name: 'value',
        type: 'string',
        description: 'Value to set',
      },
    ],
  },
];

// 基于坐标的特定操作
const coordinateBasedActions: ActionDefinition[] = [
  {
    name: 'clickByCoordinate',
    description: 'Click element at specified coordinates',
    args: COORDINATE_ARGS,
  },
  {
    name: 'setValueByCoordinate',
    description: 'Set text value in input element at specified coordinates',
    args: [
      ...COORDINATE_ARGS,
      {
        name: 'value',
        type: 'string',
        description: 'Value to set',
      },
    ],
  },
];

// 导出最终的操作数组
export const availableActions = [...baseActions, ...elementBasedActions] as const;
export const availableActionsByScreenshot = [...baseActions, ...coordinateBasedActions] as const;

// 提取操作名称类型，便于类型检查
export type ActionName = (typeof availableActions)[number]['name'];
export type ScreenshotActionName = (typeof availableActionsByScreenshot)[number]['name'];

// 导出操作类型定义，方便其他文件使用
export type { ActionDefinition, ActionArg };
