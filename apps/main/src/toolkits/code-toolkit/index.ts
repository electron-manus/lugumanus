import { CodeGeneratorAgent } from './code-generator';
import { CodeRunnerAgent } from './code-runner';

const codeToolkit = [new CodeGeneratorAgent(), new CodeRunnerAgent()];

export default codeToolkit;
