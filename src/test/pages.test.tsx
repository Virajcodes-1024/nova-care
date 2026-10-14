import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Overview, Assistant } from "../pages";
import { ConfirmDialog, Status } from "../components";
import type { ReactNode } from "react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}
describe("real server state UI", () => {
  it("shows loading while dashboard request is unresolved", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}),
    );
    mount(<Overview />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reading local records",
    );
  });
  it("shows errors without inventing dashboard metrics", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Backend disconnected"),
    );
    mount(<Overview />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Backend disconnected",
    );
    expect(screen.queryByText("Scheduled today")).not.toBeInTheDocument();
  });
  it("renders actual dashboard counts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          today: "2026-10-13",
          current_time: "2026-10-13T18:00:00+05:30",
          total: 0,
          completed: 0,
          pending: 0,
          attention: 0,
          approvals: 0,
          tasks: [],
          events: [],
          actions: [],
        }),
      ),
    );
    mount(<Overview />);
    expect(await screen.findByText("Scheduled today")).toBeInTheDocument();
    expect(screen.getAllByText("00")).toHaveLength(4);
    expect(
      screen.getByText("No event records available for this period"),
    ).toBeInTheDocument();
  });
  it("submits the entered request and selected missing-data scenario", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, options) => {
        if (options?.method === "POST")
          return new Response(
            JSON.stringify({
              id: "w",
              request: "pending tasks",
              status: "completed",
              response: {
                plan: [],
                facts: [],
                limitations: [],
                summary: "Reviewed",
                action_id: null,
              },
              steps: [],
              created_at: "2026-10-13T12:00:00Z",
            }),
          );
        const path = String(input);
        return new Response(
          JSON.stringify(
            path.endsWith("/dashboard") ? { pending: 0, tasks: [] } : [],
          ),
        );
      });
    mount(<Assistant />);
    await screen.findByText("What can we take off your mind?");
    fireEvent.change(screen.getByLabelText("Message NOVA"), {
      target: { value: "pending tasks" },
    });
    fireEvent.change(screen.getByLabelText("Demo scenario"), {
      target: { value: "missing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          body: JSON.stringify({
            message: "pending tasks",
            scenario: "missing",
          }),
        }),
      ),
    );
  });
  it("labels approval separately from execution completion", () => {
    render(<Status value="approved" />);
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.queryByText("completed")).not.toBeInTheDocument();
  });
  it("only calls approval on explicit confirmation", () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
    });
    const approve = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Approve delivery?"
        description="Local demo"
        onConfirm={approve}
        onClose={() => {}}
      />,
    );
    expect(approve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
    expect(approve).toHaveBeenCalledOnce();
  });
});
