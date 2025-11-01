import { z } from 'zod';

export const ProcessRequestSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required'),
  llm_config: z.string().optional().default('CLAUDE_FAST')
});

export type ProcessRequestDto = z.infer<typeof ProcessRequestSchema>;

