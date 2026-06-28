export interface FeishuTextBlock {
  block_type: 2;
  text: {
    elements: Array<{ text_run: { content: string } }>;
  };
}

export interface FeishuHeading1Block {
  block_type: 3;
  heading1: {
    elements: Array<{ text_run: { content: string } }>;
  };
}

export interface FeishuHeading2Block {
  block_type: 4;
  heading2: {
    elements: Array<{ text_run: { content: string } }>;
  };
}

export type FeishuBlock = FeishuTextBlock | FeishuHeading1Block | FeishuHeading2Block;

function textElements(content: string): Array<{ text_run: { content: string } }> {
  return [{ text_run: { content } }];
}

function lineToBlock(line: string): FeishuBlock {
  if (line.startsWith("# ")) {
    return { block_type: 3, heading1: { elements: textElements(line.slice(2).trim()) } };
  }

  if (line.startsWith("## ")) {
    return { block_type: 4, heading2: { elements: textElements(line.slice(3).trim()) } };
  }

  return {
    block_type: 2,
    text: { elements: textElements(line) }
  };
}

export function markdownToPlainBlocks(markdown: string): FeishuBlock[] {
  return markdown
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map(lineToBlock);
}
