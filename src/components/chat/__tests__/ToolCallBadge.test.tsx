import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolCallLabel, ToolCallBadge } from "../ToolCallBadge";

afterEach(() => cleanup());

describe("getToolCallLabel", () => {
  it("str_replace_editor create", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating file /App.jsx");
  });

  it("str_replace_editor str_replace", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/Button.tsx" })).toBe("Editing file /Button.tsx");
  });

  it("str_replace_editor insert", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/style.css" })).toBe("Editing file /style.css");
  });

  it("str_replace_editor view", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading file /App.jsx");
  });

  it("str_replace_editor undo_edit", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit in /App.jsx");
  });

  it("file_manager rename", () => {
    expect(getToolCallLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming /old.jsx → /new.jsx");
  });

  it("file_manager delete", () => {
    expect(getToolCallLabel("file_manager", { command: "delete", path: "/old.jsx" })).toBe("Deleting file /old.jsx");
  });

  it("unknown tool falls back to tool name", () => {
    expect(getToolCallLabel("some_other_tool", { command: "run" })).toBe("some_other_tool");
  });
});

describe("ToolCallBadge", () => {
  it("shows label text", () => {
    render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="result" />);
    expect(screen.getByText("Creating file /App.jsx")).toBeTruthy();
  });

  it("shows spinner when pending", () => {
    const { container } = render(
      <ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="call" />
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  it("shows green dot when done", () => {
    const { container } = render(
      <ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="result" />
    );
    expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
