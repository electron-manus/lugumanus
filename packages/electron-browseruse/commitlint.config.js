export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复bug
        'docs', // 文档更新
        'style', // 代码风格修改（不影响代码运行）
        'refactor', // 重构
        'perf', // 性能优化
        'test', // 测试
        'chore', // 构建过程或辅助工具的变动
        'revert', // 回退
        'build', // 打包
        'ci', // CI相关变更
      ],
    ],
    'subject-case': [0], // 这可以放宽主题的大小写限制
  },
};
