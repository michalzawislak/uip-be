import type { ITool } from '../tool.interface';
import { execute } from './handler';
import configData from './tool.config.json';

const tool: ITool = {
  config: configData,
  execute,
};

export default tool;