"use client";

import { useMemo } from "react";

// A small, dependency-free Markdown -> HTML renderer covering the subset the
// assistant produces: headings, bold/italic/code, lists, tables, blockquotes,
// code fences. Input is model output (trusted enough for this app), but we
// still escape raw HTML so stray angle brackets render literally.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="text-brand underline">$1</a>',
    );
}

function render(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  const flushTable = (rows: string[]) => {
    const cells = (row: string) =>
      row
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
    const header = cells(rows[0]);
    const bodyRows = rows.slice(2).map(cells);
    out.push("<table><thead><tr>");
    header.forEach((h) => out.push(`<th>${inline(h)}</th>`));
    out.push("</tr></thead><tbody>");
    bodyRows.forEach((r) => {
      out.push("<tr>");
      r.forEach((c) => out.push(`<td>${inline(c)}</td>`));
      out.push("</tr>");
    });
    out.push("</tbody></table>");
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Table (header row + separator row of dashes)
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].includes("|")) rows.push(lines[i++]);
      flushTable(rows);
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = Math.min(h[1].length, 3);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]))
        buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      out.push("<ul>");
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]))
        out.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ""))}</li>`);
      out.push("</ul>");
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      out.push("<ol>");
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]))
        out.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ""))}</li>`);
      out.push("</ol>");
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (gather consecutive non-empty, non-special lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+|```)/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  return out.join("\n");
}

export default function Markdown({ content }: { content: string }) {
  const html = useMemo(() => render(content), [content]);
  return (
    <div
      className="prose-study"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
