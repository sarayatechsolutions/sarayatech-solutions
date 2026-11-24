import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MarkdownRenderer from "./MarkdownRenderer";

function renderMd(content: string) {
  return render(
    <MemoryRouter>
      <MarkdownRenderer content={content} />
    </MemoryRouter>,
  );
}

describe("MarkdownRenderer code", () => {
  it("renders a fenced block as plain <pre><code> keeping the text", () => {
    const { container } = renderMd("```ts\nconst a = 1;\n```");
    const code = container.querySelector("pre > code");
    expect(code).not.toBeNull();
    expect(code).toHaveTextContent("const a = 1;");
    expect(code).toHaveAttribute("data-language", "ts");
  });

  it("renders inline code without a <pre> wrapper", () => {
    const { container } = renderMd("run `npm test` now");
    expect(container.querySelector("pre")).toBeNull();
    expect(container.querySelector("code")).toHaveTextContent("npm test");
  });
});
