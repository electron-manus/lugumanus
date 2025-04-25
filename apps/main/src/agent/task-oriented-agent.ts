import { lastValueFrom } from 'rxjs';
import {
  executorAgentSystemPrompt,
  plannerAgentSystemPrompt,
  validatorAgentSystemPrompt,
} from '../prompt/index.js';
import type { SpecializedToolAgent } from '../toolkits/types.js';
import { BaseAgent } from './base-agent.js';
import { DialogueAgent } from './dialogue-agent.js';
import type { AgentTaskRef } from './type.js';

type Parameters = {
  task: string;
  expected_result: string;
  context?: string;
};

// 子任务类型定义
type SubTask = {
  id: number;
  description: string;
  completed: boolean;
  result?: string;
  dependencies?: number[]; // 添加依赖项字段，标识该任务依赖哪些前置任务
};

export class TaskOrientedAgent extends BaseAgent implements SpecializedToolAgent {
  override readonly name = 'Task-Oriented-Agent';
  readonly description =
    'An agent that can break down complex tasks into subtasks and complete them step by step.';
  readonly parameters = {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'The main task to be executed.' },
      expected_result: {
        type: 'string',
        description: 'The expected result of the task.',
      },
    },
    required: ['task', 'expected_result'],
  };

  readonly strict = true;

  private plannerAgent = new BaseAgent({
    temperature: 0.2,
  });

  private executorAgent = new DialogueAgent();

  private validatorAgent = new BaseAgent({
    temperature: 0.1,
  });

  static readonly MAX_ITERATIONS = 10;
  static readonly MAX_SUBTASKS = 7;

  // 添加类成员变量以存储所有子任务
  private subTasks: SubTask[] = [];

  constructor() {
    super({
      temperature: 0,
      tools: [],
    });
  }

  async execute(query: Parameters, taskRef: AgentTaskRef): Promise<string> {
    // 初始化代理系统消息
    this.plannerAgent.initialSystemMessage(
      plannerAgentSystemPrompt(TaskOrientedAgent.MAX_SUBTASKS),
    );

    this.validatorAgent.initialSystemMessage(validatorAgentSystemPrompt());

    if (taskRef.abortSignal.aborted) {
      return 'Task has been aborted.';
    }

    // 步骤1: 分解任务
    const subTasks = await this.decomposeTasks(query.task, taskRef);
    if (!subTasks || subTasks.length === 0) {
      return 'Unable to decompose the task, please provide a clearer task description.';
    }

    // 存储全局变量以便executeSubTask可以访问所有子任务
    this.subTasks = subTasks;

    // 步骤2: 执行子任务
    for (const subTask of subTasks) {
      if (taskRef.abortSignal.aborted) {
        return 'Task has been aborted.';
      }

      let retryCount = 0;
      let retryResult = '';
      this.executorAgent = new DialogueAgent();
      this.executorAgent.initialSystemMessage(executorAgentSystemPrompt());

      while (retryCount < 3) {
        const result = await this.executeSubTask(subTask, query.task, taskRef, retryResult);

        // 验证子任务结果
        const validateResult = await this.validateSubTask(subTask, result, taskRef);
        subTask.completed = validateResult.isValid;
        subTask.result = result;
        retryResult += `\n\n${validateResult.reason}`;

        // 如果验证失败，尝试重新执行一次
        if (validateResult.isValid) {
          break;
        }
        retryCount++;
      }
    }

    // 步骤3: 汇总结果
    return await this.summarizeResults(query.task, subTasks, query.expected_result, taskRef);
  }

  private async decomposeTasks(task: string, taskRef: AgentTaskRef): Promise<SubTask[]> {
    const prompt = `Break tasks into subtasks.
Generate subtasks as needed. It is not necessary to generate the maximum number of subtasks every time.
The task to be broken down is:
${task}
For each subtask, please provide: 
1. id: a unique number
2. description: clear description of what needs to be done
3. dependencies: an array of subtask IDs that this subtask depends on (or empty array if none)

Please ensure that the task is not overly decomposed. Only create subtasks that are necessary and meaningful.

Please identify dependencies between subtasks. For example, if a subtask needs the results from previous subtasks, list those subtask IDs in its dependencies.

Output a list of subtasks in JSON format.`;

    const completion = await this.plannerAgent.run(prompt, taskRef);
    if (!completion) {
      return [];
    }

    const messageModel = await taskRef.createTaskMessage({
      type: 'editor',
      description: 'Task Planning',
      payload: '',
    });

    completion.contentStream.subscribe({
      next: (chunk) => {
        if (messageModel.task) {
          messageModel.task.payload = chunk;
        }
        taskRef.observer.next(messageModel);
        taskRef.studio.preview({
          type: 'editor',
          payload: chunk,
          description: 'Task Planning',
        });
      },
      complete() {
        if (messageModel.task) {
          taskRef.completeTaskMessage(messageModel.task);
        }
        taskRef.completeMessage(messageModel);
        taskRef.observer.next(messageModel);
      },
    });

    const content = await lastValueFrom(completion.contentStream);

    try {
      // 尝试从回复中提取JSON
      let jsonContent = '';

      // 匹配 markdown 代码块中的 JSON
      const markdownMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (markdownMatch) {
        jsonContent = markdownMatch[1].trim();
      }
      // 匹配数组
      else if (content.includes('[') && content.includes(']')) {
        const arrayMatch = content.match(/\[([\s\S]*?)\]/);
        if (arrayMatch) {
          jsonContent = `[${arrayMatch[1]}]`;
        }
      }
      // 匹配对象
      else if (content.includes('{') && content.includes('}')) {
        const objMatch = content.match(/\{([\s\S]*?)\}/);
        if (objMatch) {
          jsonContent = `{${objMatch[1]}}`;
        }
      } else {
        jsonContent = content;
      }

      // 尝试解析 JSON
      try {
        // 确保内容是一个数组
        let parsedContent: { id: number; description: string; dependencies?: number[] }[];
        if (jsonContent.trim().startsWith('{')) {
          // 如果是单个对象，将其包装为数组
          parsedContent = [JSON.parse(jsonContent)];
        } else if (jsonContent.trim().startsWith('[')) {
          // 如果已经是数组，直接解析
          parsedContent = JSON.parse(jsonContent);
        } else {
          // 尝试先包装成数组再解析
          parsedContent = JSON.parse(`[${jsonContent}]`);
        }

        // 确保解析结果是数组
        const tasks = Array.isArray(parsedContent) ? parsedContent : [parsedContent];
        return tasks.map(
          (task: { id: number; description: string; dependencies?: number[] }, index: number) => ({
            id: task.id || index + 1,
            description: task.description,
            completed: false,
            dependencies: task.dependencies || [],
          }),
        );
      } catch (parseError) {
        console.error('JSON 解析失败，尝试手动解析', parseError);
        // 如果解析失败，尝试手动解析
        const lines = content.split('\n').filter((line) => line.trim().length > 0);
        const tasks: SubTask[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const match = line.match(/^(\d+)[\.:\)]\s+(.+)$/);
          if (match) {
            tasks.push({
              id: Number.parseInt(match[1]),
              description: match[2],
              completed: false,
            });
          }
        }

        return tasks;
      }
    } catch (error) {
      console.error('JSON 解析失败，尝试手动解析', error);
      // 如果解析失败，尝试手动解析
      const lines = content.split('\n').filter((line) => line.trim().length > 0);
      const tasks: SubTask[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(/^(\d+)[\.:\)]\s+(.+)$/);
        if (match) {
          tasks.push({
            id: Number.parseInt(match[1]),
            description: match[2],
            completed: false,
          });
        }
      }

      return tasks;
    }
  }

  private async executeSubTask(
    subTask: SubTask,
    mainTask: string,
    taskRef: AgentTaskRef,
    previousResult?: string,
  ): Promise<string> {
    let prompt = `Please execute the following subtask: \n\n${subTask.description}\n\n`;

    if (previousResult) {
      prompt += `The previous execution result did not pass the validation. The reason is:
${previousResult}
please retry it in a different way.`;
    }

    // 获取依赖任务的结果
    let dependencyResults = '';
    if (subTask.dependencies && subTask.dependencies.length > 0) {
      dependencyResults = 'Previous subtask results you can reference:\n\n';
      for (const depId of subTask.dependencies) {
        const depTask = this.subTasks.find((t) => t.id === depId);
        if (depTask?.completed && depTask.result) {
          dependencyResults += `Subtask #${depId} (${depTask.description}):\n${depTask.result}\n\n`;
        }
      }
    }

    // 构建上下文信息，包含当前任务的整体情况
    const context = `This is part of a larger task.
Main task: ${mainTask}

Current subtask #${subTask.id}: ${subTask.description}

${dependencyResults}

Note: Please only solve this specific subtask. Even if you see other information in the context, limit your response to the scope of the current subtask. Do not attempt to solve other subtasks or the overall task.`;

    const completion = await this.executorAgent.execute(
      {
        question: prompt,
        expected_result: '',
        context: context,
      },
      taskRef,
    );

    if (!completion) {
      return 'Execution failed, unable to obtain result.';
    }

    return completion;
  }

  private async validateSubTask(
    subTask: SubTask,
    result: string,
    taskRef: AgentTaskRef,
  ): Promise<{ isValid: boolean; reason: string }> {
    const prompt = `Please strictly verify whether the execution result of the following subtask fully meets the requirements:

Subtask: ${subTask.description}

Execution result:
${result}

Verification criteria:
1. Whether the result fully addresses all the requirements described in the subtask.
2. If the subtask requires code implementation, whether the complete code is provided.
3. If the subtask requires calculation or analysis, whether the specific executable result is provided.

Please briefly explain the reasons for verification and provide a clear verification result at the end, with the word count not exceeding 140 characters. 
Reply to me in the language of the Subtask and Execution result.  
If all requirements are fully met, output "VALIDATED: true", otherwise output "VALIDATED: false" and list the unmet requirements. `;

    const completion = await this.validatorAgent.run(prompt, taskRef);
    if (!completion) {
      return {
        isValid: false,
        reason: 'Validation failed, unable to obtain result.',
      };
    }

    const messageModel = await taskRef.createMessage('Task');
    completion.contentStream.subscribe({
      next: (chunk) => {
        messageModel.content = chunk;
        taskRef.observer.next(messageModel);
      },
      complete() {
        taskRef.completeMessage(messageModel);
        taskRef.observer.next(messageModel);
      },
    });

    const content = await lastValueFrom(completion.contentStream);

    const isValid = content.toLowerCase().includes('validated: true');
    return {
      isValid,
      reason: content,
    };
  }

  private async summarizeResults(
    task: string,
    subTasks: SubTask[],
    expectedResult: string,
    taskRef: AgentTaskRef,
  ): Promise<string> {
    const completedTasks = subTasks.filter((task) => task.completed);
    const allCompleted = completedTasks.length === subTasks.length;

    let prompt = `Based on the following completed subtask results, please generate a final task summary:\n\nMain task: ${task}\n\nExpected result: ${expectedResult}\n\n`;

    prompt += `Subtask completion status: ${completedTasks.length}/${subTasks.length}\n\n`;

    for (const task of subTasks) {
      prompt += `Subtask #${task.id}: ${task.description}\n`;
      prompt += `Completion status: ${task.completed ? '✅ Completed' : '❌ Incomplete'}\n`;
      if (task.result) {
        prompt += `Result: ${task.result.substring(0, 200)}${task.result.length > 200 ? '...' : ''}\n\n`;
      }
    }

    if (!allCompleted) {
      prompt +=
        '\nNote: Not all subtasks were successfully completed. Please mention this in your summary and explain the potential impact.';
    }

    const completion = await this.plannerAgent.run(prompt, taskRef);
    if (!completion) {
      return 'Unable to generate final summary.';
    }

    await taskRef.studio.startWithStream(
      {
        type: 'editor',
        description: 'Final Task Summary',
        payload: '',
      },
      completion,
      taskRef.observer,
    );

    return await lastValueFrom(completion.contentStream);
  }
}
