function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;
  let table: string[][] = [];

  const flushList = () => {
    if (!list.length) return;
    const items = list.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(
      ordered ? (
        <ol key={blocks.length} className="my-4 list-decimal space-y-2 pl-6">
          {items}
        </ol>
      ) : (
        <ul key={blocks.length} className="my-4 list-disc space-y-2 pl-6">
          {items}
        </ul>
      ),
    );
    list = [];
  };

  const flushTable = () => {
    if (!table.length) return;
    const [head, ...rows] = table;
    blocks.push(
      <div key={blocks.length} className="my-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              {head!.map((cell, i) => (
                <th key={i} className="px-4 py-2 font-semibold">
                  {inline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2">
                    {inline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    table = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^-{2,}$/.test(c))) continue;
      table.push(cells);
      continue;
    }
    flushTable();

    if (/^\d+\.\s/.test(line)) {
      if (!ordered) flushList();
      ordered = true;
      list.push(line.replace(/^\d+\.\s/, ""));
      continue;
    }
    if (line.startsWith("- ")) {
      if (ordered) flushList();
      ordered = false;
      list.push(line.slice(2));
      continue;
    }
    flushList();

    if (!line.trim()) continue;
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={blocks.length} className="mt-8 font-serif text-xl font-semibold text-foreground">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={blocks.length} className="mt-10 font-serif text-2xl font-semibold text-foreground">
          {line.slice(3)}
        </h2>,
      );
    } else {
      blocks.push(
        <p key={blocks.length} className="mt-4 text-base leading-8 text-foreground/90">
          {inline(line)}
        </p>,
      );
    }
  }
  flushList();
  flushTable();

  return <div className="max-w-none">{blocks}</div>;
}
