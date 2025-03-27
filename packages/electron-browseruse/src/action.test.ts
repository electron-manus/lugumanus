import { describe, expect, test } from 'bun:test';
import {
  type ActionName,
  type ScreenshotActionName,
  availableActions,
  availableActionsByScreenshot,
} from './action';

describe('操作定义单元测试', () => {
  // 测试基础操作集合
  describe('基础操作定义', () => {
    test('所有操作应该有名称和描述', () => {
      for (const action of availableActions) {
        expect(action.name).toBeDefined();
        expect(action.description).toBeDefined();
        expect(typeof action.name).toBe('string');
        expect(typeof action.description).toBe('string');
      }
    });

    test('所有基础操作应该在可用操作列表中', () => {
      const basicActionNames = [
        'back',
        'restart',
        'scrollDown',
        'scrollUp',
        'finish',
        'fail',
        'identifyBlocker',
      ];
      for (const name of basicActionNames) {
        const found = availableActions.find((action) => action.name === name);
        expect(found).toBeDefined();
      }
    });
  });

  // 测试基于元素的操作
  describe('基于元素的操作', () => {
    test('click操作应该有元素ID参数', () => {
      const clickAction = availableActions.find((action) => action.name === 'click');
      expect(clickAction).toBeDefined();
      expect(clickAction?.args.length).toBe(1);
      expect(clickAction?.args[0].name).toBe('elementId');
      expect(clickAction?.args[0].type).toBe('number');
    });

    test('setValue操作应该有元素ID和值参数', () => {
      const setValueAction = availableActions.find((action) => action.name === 'setValue');
      expect(setValueAction).toBeDefined();
      expect(setValueAction?.args.length).toBe(2);
      expect(setValueAction?.args[0].name).toBe('elementId');
      expect(setValueAction?.args[1].name).toBe('value');
      expect(setValueAction?.args[1].type).toBe('string');
    });
  });

  // 测试基于坐标的操作
  describe('基于坐标的操作', () => {
    test('clickByCoordinate操作应该有坐标参数', () => {
      const clickByCoordinateAction = availableActionsByScreenshot.find(
        (action) => action.name === 'clickByCoordinate',
      );
      expect(clickByCoordinateAction).toBeDefined();
      expect(clickByCoordinateAction?.args.length).toBe(2);
      expect(clickByCoordinateAction?.args[0].name).toBe('x');
      expect(clickByCoordinateAction?.args[1].name).toBe('y');
    });

    test('setValueByCoordinate操作应该有坐标和值参数', () => {
      const setValueByCoordinateAction = availableActionsByScreenshot.find(
        (action) => action.name === 'setValueByCoordinate',
      );
      expect(setValueByCoordinateAction).toBeDefined();
      expect(setValueByCoordinateAction?.args.length).toBe(3);
      expect(setValueByCoordinateAction?.args[0].name).toBe('x');
      expect(setValueByCoordinateAction?.args[1].name).toBe('y');
      expect(setValueByCoordinateAction?.args[2].name).toBe('value');
    });
  });

  // 测试导出的数组和类型
  describe('导出的数组和类型', () => {
    test('availableActions应包含基础操作和基于元素的操作', () => {
      expect(availableActions.length).toBeGreaterThanOrEqual(9); // 7个基础操作 + 2个元素操作
    });

    test('availableActionsByScreenshot应包含基础操作和基于坐标的操作', () => {
      expect(availableActionsByScreenshot.length).toBeGreaterThanOrEqual(9); // 7个基础操作 + 2个坐标操作
    });

    test('ActionName类型应与availableActions中的名称匹配', () => {
      // 这是一个类型测试，运行时不会失败
      // 仅作为类型检查的示例
      const actionName: ActionName = 'click';
      expect(availableActions.some((action) => action.name === actionName)).toBeTruthy();
    });

    test('ScreenshotActionName类型应与availableActionsByScreenshot中的名称匹配', () => {
      // 这是一个类型测试，运行时不会失败
      // 仅作为类型检查的示例
      const screenshotActionName: ScreenshotActionName = 'clickByCoordinate';
      expect(
        availableActionsByScreenshot.some((action) => action.name === screenshotActionName),
      ).toBeTruthy();
    });
  });
});
