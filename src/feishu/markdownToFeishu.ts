export interface FeishuTextBlock {
  block_type: 2;
  text: {
    elements: Array<{ text_run: { content: string } }>;
  };
}

export function markdownToPlainBlocks(markdown: string): FeishuTextBlock[] {
  return markdown
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      block_type: 2,
      text: { elements: [{ text_run: { content: line } }] }
    }));
}
