import config from './tool.config.json';
import { execute } from './handler';
import type { ITool } from '../tool.interface';

const tool: ITool = {
  config,
  execute
};

export default tool;

