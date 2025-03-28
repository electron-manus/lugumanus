export const codeCommandMap: Record<string, string> = {
  go: 'go version',
  python: 'python --version || python3 --version',
  java: 'java -version',
  ruby: 'ruby --version',
  php: 'php --version',
  rust: 'rustc --version',
  c: 'gcc --version',
  cpp: 'g++ --version',
};
