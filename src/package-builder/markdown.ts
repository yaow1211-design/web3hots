export function bullet(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

export function sourceLinks(sources: Array<{ source: string; url: string }>): string {
  return sources.map((source) => `[${source.source}](${source.url})`).join(", ");
}
