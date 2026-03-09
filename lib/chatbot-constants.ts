import fs from "fs";
import path from "path";

const contentDir = path.join(process.cwd(), "content");

function loadMarkdown(filename: string): string {
  const filePath = path.join(contentDir, filename);
  return fs.readFileSync(filePath, "utf-8").trim();
}

export const SYSTEM_PROMPT = loadMarkdown("system-prompt.md");
export const KNOWLEDGE_BASE = loadMarkdown("knowledge-base.md");
