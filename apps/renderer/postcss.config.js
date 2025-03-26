import { join } from 'node:path';

// Note: If you use library-specific PostCSS/Tailwind configuration then you should remove the `postcssConfig` build
// option from your application's configuration (i.e. project.json).
//
// See: https://nx.dev/guides/using-tailwind-css-in-react#step-4:-applying-configuration-to-libraries

export default {
  plugins: {
    tailwindcss: {
      config: join(import.meta.dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
};
