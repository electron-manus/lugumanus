import Editor from '@monaco-editor/react';
import hljs from 'highlight.js';
import { useEffect, useState } from 'react';

function EditorPreview(props: { content: string }) {
  const [language, setLanguage] = useState('plaintext');

  const content =
    typeof props.content === 'string' ? props.content : JSON.stringify(props.content, null, 2);

  useEffect(() => {
    // 使用 highlight.js 自动检测语言
    detectLanguage(content);
  }, [content]);

  const detectLanguage = (content: string) => {
    if (!content || content.trim().length === 0) {
      setLanguage('plaintext');
      return;
    }

    try {
      // 使用 highlight.js 的自动检测功能
      const result = hljs.highlightAuto(content);

      // 将 highlight.js 的语言名称映射到 Monaco 编辑器支持的语言
      const detectedLanguage = result.language || 'plaintext';

      // 语言映射（highlight.js 到 Monaco）
      const languageMap: { [key: string]: string } = {
        jsx: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        ts: 'typescript',
        py: 'python',
        rb: 'ruby',
        cs: 'csharp',
        json: 'json',
        xml: 'xml',
        md: 'markdown',
        css: 'css',
        scss: 'scss',
        less: 'less',
        sql: 'sql',
        shell: 'shell',
        bash: 'bash',
        php: 'php',
      };

      setLanguage(languageMap[detectedLanguage] || detectedLanguage);
    } catch (error) {
      console.error('语言检测失败', error);
      setLanguage('plaintext');
    }
  };

  return (
    <Editor
      value={content}
      language={language}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        fontSize: 16,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace, Consolas",
      }}
    />
  );
}

export default EditorPreview;
