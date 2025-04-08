import { type ChildProcess, spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { platform } from 'node:os';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import Bun from 'bun';
import { debounce } from 'lodash';
import sharePkg from '../../../package.json';
import pkg from '../package.json';

// 确保在所有环境下都能获取正确的文件路径
const getCurrentDir = () => {
  try {
    return import.meta.dirname;
  } catch (e) {
    // 兼容方案
    return dirname(fileURLToPath(import.meta.url));
  }
};

const ROOT_DIR = resolve(getCurrentDir(), '../');
const SRC_DIR = join(ROOT_DIR, 'src');
const DIST_DIR = join(ROOT_DIR, 'dist');

// 根据不同操作系统设置正确的 Electron 可执行文件名
const isWindows = platform() === 'win32';
const ELECTRON_BIN = join(
  ROOT_DIR,
  '../../node_modules/.bin/',
  isWindows ? 'electron.cmd' : 'electron',
);

let electronProcess: ChildProcess | null = null;

// 编译 TypeScript 文件
async function compile() {
  console.log('🔄 正在编译 TypeScript 文件...', [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(sharePkg.dependencies),
  ]);

  try {
    await Bun.build({
      entrypoints: [
        join(SRC_DIR, 'main.ts'),
        join(SRC_DIR, 'preload.ts'),
        join(SRC_DIR, 'studio-preload/index.ts'),
      ],
      outdir: DIST_DIR,
      target: 'node',
      external: [...Object.keys(pkg.dependencies), ...Object.keys(sharePkg.dependencies)],
      format: 'esm',
    });
    console.log('✅ 编译完成');
    return true;
  } catch (error) {
    console.error('❌ 编译失败:\n', error);
    return false;
  }
}

// 启动 Electron (使用防抖处理)
const debouncedStartElectron = debounce(() => {
  if (electronProcess) {
    try {
      // 在 Windows 上需要使用不同的方法杀死进程
      if (isWindows) {
        electronProcess?.pid &&
          spawn('taskkill', ['/pid', electronProcess.pid.toString(), '/f', '/t']);
      } else {
        electronProcess?.kill();
      }
    } catch (error) {
      console.error('终止旧进程失败:', error);
    }
    electronProcess = null;
  }

  const args = [join(DIST_DIR, 'main.js')];

  // 添加调试参数
  if (process.env.DEBUG_MAIN_PROCESS === 'true') {
    args.unshift('--inspect=5858');
  }

  electronProcess = spawn(ELECTRON_BIN, args, {
    stdio: 'inherit',
    ...(isWindows ? { shell: true } : {}),
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
  });

  electronProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Electron 进程已退出，退出码: ${code}`);
    }
  });
}, 1000); // 延迟1000毫秒

// 监听文件变化
function watchFiles() {
  console.log('👀 正在监听文件变化...');

  try {
    watch(SRC_DIR, { recursive: true }, async (_, filename) => {
      if (filename && /\.(ts|tsx|js|jsx)$/.test(filename)) {
        console.log(`🔄 检测到文件变化: ${filename}`);
        const success = await compile();
        if (success) {
          debouncedStartElectron();
        }
      }
    });
  } catch (error) {
    console.error('监听文件失败:', error);
    // 如果监听失败，仍然编译并启动一次
    compile().then((success) => {
      if (success) debouncedStartElectron();
    });
  }
}

// 主函数
async function bootstrap() {
  const success = await compile();
  if (success) {
    debouncedStartElectron();
    watchFiles();
  }
}

// 运行启动脚本
bootstrap().catch((error) => {
  console.error('💥 启动失败:', error);
  process.exit(1);
});
