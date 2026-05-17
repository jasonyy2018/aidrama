export interface AgentTagEvent {
  tag: string;
  content: string;
  key: string;
}

const TAG_RE = /<(\w+)>([\s\S]*?)<\/\1>/g;

export function scanAgentTags(text: string, processedKeys: Set<string>): AgentTagEvent[] {
  const events: AgentTagEvent[] = [];
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(text)) !== null) {
    const key = `${match[1]}_${match.index}`;
    if (!processedKeys.has(key)) {
      events.push({ tag: match[1], content: match[2].trim(), key });
    }
  }
  return events;
}
