import { type ChildProcess, spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { join, resolve } from 'node:path';
// @ts-ignore
import Bun from 'bun';
import { debounce } from 'lodash';
import sharePkg from '../../../package.json';
import pkg from '../package.json';

// const pkg = require(join(ROOT_DIR, "package.json"));

const ROOT_DIR = resolve(import.meta.dirname, '../');
const SRC_DIR = join(ROOT_DIR, 'src');
const DIST_DIR = join(ROOT_DIR, 'dist');
const ELECTRON_BIN = join(ROOT_DIR, '../../node_modules/.bin/electron');

let electronProcess: ChildProcess | null = null;

// 编译 TypeScript 文件
async function compile() {
  console.log('🔄 正在编译 TypeScript 文件...');

  try {
    await Bun.build({
      entrypoints: [join(SRC_DIR, 'main.ts')],
      outdir: DIST_DIR,
      target: 'node',
      external: [...Object.keys(pkg.dependencies), ...Object.keys(sharePkg.dependencies)],
      format: 'esm',
    });
    console.log('✅ 编译完成');
    return true;
  } catch (error) {
    console.error('❌ 编译失败:', error);
    return false;
  }
}

// 启动 Electron (使用防抖处理)
const debouncedStartElectron = debounce(() => {
  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }

  electronProcess = spawn(ELECTRON_BIN, [join(DIST_DIR, 'main.js')], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
  });

  electronProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Electron 进程已退出，退出码: ${code}`);
    }
  });
}, 1000); // 延迟500毫秒

// 监听文件变化
function watchFiles() {
  console.log('👀 正在监听文件变化...');

  watch(SRC_DIR, { recursive: true }, async (_, filename) => {
    if (filename && /\.(ts|tsx|js|jsx)$/.test(filename)) {
      console.log(`🔄 检测到文件变化: ${filename}`);
      const success = await compile();
      if (success) {
        debouncedStartElectron();
      }
    }
  });
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
