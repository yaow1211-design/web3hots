export function bullet(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

export function sourceLinks(sources: Array<{ source: string; url: string }>): string {
  return sources.map((source) => `[${source.source}](${source.url})`).join(", ");
}

function dateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map((part) => Number(part));
  return { year, month, day };
}

function englishDate(date: string): string {
  const { year, month, day } = dateParts(date);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  return `${monthNames[month - 1] ?? "Unknown"} ${day}, ${year}`;
}

export function chineseMonthDay(date: string): string {
  const { month, day } = dateParts(date);
  return `${month}月${day}日`;
}

export function bilingualDateLines(date: string): string[] {
  const { year, month, day } = dateParts(date);
  return [`Date: ${englishDate(date)}`, `日期：${year}年${month}月${day}日`];
}

export function dailyUpdateHeader(date: string, title: string): string[] {
  return [`# ${chineseMonthDay(date)} ${title}`, "", ...bilingualDateLines(date)];
}
