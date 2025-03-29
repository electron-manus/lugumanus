import { exec } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import * as vm from 'node:vm';
import yaml from 'js-yaml';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';
import { codeCommandMap } from './code-support.js';

const execAsync = promisify(exec);

export class CodeRunnerAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'CodeRunnerTool';

  description = 'A tool for generating and running JavaScript code';

  parameters = {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The code to execute' },
      language: {
        type: 'string',
        description: 'Code language, supports multiple programming languages',
        default: 'javascript',
        enum: Object.keys(codeCommandMap),
      },
      timeout: {
        type: 'number',
        description: 'Execution timeout (milliseconds), default is 5000ms',
        default: 5000,
      },
      context: {
        type: 'object',
        description: 'Context variables for code execution',
        default: {},
      },
    },
    required: ['code'],
  };

  strict = true;

  async execute(query: Record<string, unknown>, taskRef: AgentTaskRef): Promise<string> {
    const code = query.code as string;
    const language = (query.language as string) || 'javascript';
    const timeout = (query.timeout as number) || 5000;
    const contextInput = (query.context as Record<string, unknown>) || {};

    // 捕获输出
    const logs: string[] = [];
    const errors: string[] = [];
    let result: unknown = undefined;

    try {
      if (language === 'javascript') {
        // JavaScript 执行逻辑
        // 创建沙箱环境
        const sandbox = {
          console: {
            log: (...args: unknown[]) => {
              logs.push(args.map((arg) => String(arg)).join(' '));
            },
            error: (...args: unknown[]) => {
              errors.push(args.map((arg) => String(arg)).join(' '));
            },
          },
          process: {
            env: { NODE_ENV: 'development' },
          },
          // 添加所有来自 contextInput 的变量到沙箱
          ...contextInput,
        };

        // 创建上下文
        const context = vm.createContext(sandbox);

        // 执行代码
        const script = new vm.Script(code);
        result = script.runInContext(context, { timeout });
      } else if (Object.keys(codeCommandMap).includes(language)) {
        // 其他语言执行逻辑
        const fileExtensionMap: Record<string, string> = {
          python: 'py',
          go: 'go',
          java: 'java',
          ruby: 'rb',
          php: 'php',
          rust: 'rs',
          c: 'c',
          cpp: 'cpp',
        };

        const extension = fileExtensionMap[language];
        const tempFilePath = `/tmp/${language}_exec_${Date.now()}.${extension}`;
        await writeFile(tempFilePath, code);

        try {
          // 检查是否安装了对应的语言环境
          await execAsync(codeCommandMap[language], { timeout: 5000 }).catch(() => {
            throw new Error(
              `${language} environment is not installed. Please install ${language} first.`,
            );
          });

          // 根据不同语言执行不同的编译和运行命令
          let compileCmd = '';
          let runCmd = '';

          switch (language) {
            case 'python':
              try {
                // 优先尝试 python3 命令
                await execAsync('python3 --version', { timeout: 2000 });
                runCmd = `python3 ${tempFilePath}`;
              } catch (err) {
                // 如果 python3 不可用，则尝试 python 命令
                try {
                  await execAsync('python --version', { timeout: 2000 });
                  runCmd = `python ${tempFilePath}`;
                } catch (pyErr) {
                  throw new Error('Python is not installed. Please install Python first.');
                }
              }
              break;
            case 'go':
              runCmd = `go run ${tempFilePath}`;
              break;
            case 'java': {
              // 从代码中提取类名
              const className = code.match(/public\s+class\s+(\w+)/)?.[1] || 'Main';
              compileCmd = `javac ${tempFilePath}`;
              runCmd = `java -cp /tmp ${className}`;
              break;
            }
            case 'ruby':
              runCmd = `ruby ${tempFilePath}`;
              break;
            case 'php':
              runCmd = `php ${tempFilePath}`;
              break;
            case 'rust': {
              const rustOutPath = `/tmp/rust_exec_${Date.now()}`;
              compileCmd = `rustc ${tempFilePath} -o ${rustOutPath}`;
              runCmd = rustOutPath;
              break;
            }
            case 'c': {
              const cOutPath = `/tmp/c_exec_${Date.now()}`;
              compileCmd = `gcc ${tempFilePath} -o ${cOutPath}`;
              runCmd = cOutPath;
              break;
            }
            case 'cpp': {
              const cppOutPath = `/tmp/cpp_exec_${Date.now()}`;
              compileCmd = `g++ ${tempFilePath} -o ${cppOutPath}`;
              runCmd = cppOutPath;
              break;
            }
          }

          // 编译（如果需要）
          if (compileCmd) {
            const { stdout: compileStdout, stderr: compileStderr } = await execAsync(compileCmd, {
              timeout,
            });
            if (compileStderr) errors.push(`Compilation error: ${compileStderr}`);
            if (compileStdout) logs.push(compileStdout);
          }

          // 运行
          const { stdout, stderr } = await execAsync(runCmd, { timeout });
          if (stdout) logs.push(stdout);
          if (stderr) errors.push(stderr);
          result = stdout.trim();
        } finally {
          // 删除临时文件
          await unlink(tempFilePath).catch(() => {});
          // 删除编译产生的文件（如有）
          if (language === 'rust' || language === 'c' || language === 'cpp') {
            const outPath = `/tmp/${language}_exec_${Date.now()}`;
            await unlink(outPath).catch(() => {});
          }
        }
      } else {
        throw new Error(`Unsupported language: ${language}`);
      }

      await taskRef.studio.start(
        {
          type: 'editor',
          description: 'Code Execution Result',
          payload: `${query.code}
        
// output: 
// ${result}
// logs:
// ${logs.join('\n')}
// errors:
// ${errors.join('\n')}
        `,
        },
        taskRef.observer,
        taskRef.abortSignal,
      );

      return yaml.dump({
        success: true,
        result: result !== undefined ? String(result) : 'undefined',
        logs,
        errors,
      });
    } catch (error) {
      return yaml.dump({
        success: false,
        error: String(error),
        logs,
        errors,
      });
    }
  }
}
