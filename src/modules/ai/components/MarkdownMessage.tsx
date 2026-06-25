import type { ReactNode } from "react";

export const MarkdownMessage = ({ content }: { content: string }) => {
  const blocks = content.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-3 text-sm leading-6">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => line.trim().startsWith("- "));
        if (isList) {
          return (
            <ul key={index} className="space-y-1 pl-4">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="list-disc">{renderInline(line.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{renderInline(block)}</p>;
      })}
    </div>
  );
};

const renderInline = (value: string): ReactNode[] => {
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};
