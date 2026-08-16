import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createWorkout: vi.fn(),
  ensureDefaultWorkouts: vi.fn(),
  deleteWorkout: vi.fn(),
  getSessionHistory: vi.fn(),
  getWorkoutForUser: vi.fn(),
  getWorkoutsForUser: vi.fn(),
  recordSession: vi.fn(),
  updateWorkoutOrder: vi.fn(),
}));
const storageMocks = vi.hoisted(() => ({ storagePut: vi.fn() }));
const llmMocks = vi.hoisted(() => ({ extractWorkoutFromPdf: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => storageMocks);
vi.mock("./llm", () => llmMocks);

import { appRouter } from "./routers";

const ctx = { user: { id: 7, openId: "test", name: "Test", email: "test@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as any, res: {} as any } as TrpcContext;
const workout = { id: 12, userId: 7, title: "Força", orderIndex: 0, sections: [], createdAt: new Date(), updatedAt: new Date() };

describe("workouts procedures", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("creates a workout and preserves source metadata", async () => {
    dbMocks.createWorkout.mockResolvedValue(workout);
    const result = await appRouter.createCaller(ctx).workouts.create({ title: "Força", sections: [], sourceFileKey: "7/source.pdf", sourceFileName: "source.pdf" });
    expect(dbMocks.createWorkout).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, sourceFileKey: "7/source.pdf", sourceFileName: "source.pdf" }));
    expect(result).toEqual(workout);
  });

  it("lists workouts and reorders them for the authenticated user", async () => {
    dbMocks.ensureDefaultWorkouts.mockResolvedValue([workout]);
    const caller = appRouter.createCaller(ctx);
    expect(await caller.workouts.list()).toEqual([workout]);
    await caller.workouts.reorder({ ids: [12, 13] });
    expect(dbMocks.updateWorkoutOrder).toHaveBeenCalledWith(7, [12, 13]);
  });

  it("records completed and skipped sessions with a workout snapshot", async () => {
    dbMocks.getWorkoutForUser.mockResolvedValue(workout);
    dbMocks.recordSession.mockResolvedValue({ id: 1, action: "completed" });
    const caller = appRouter.createCaller(ctx);
    await caller.workouts.session({ id: 12, action: "completed" });
    await caller.workouts.session({ id: 12, action: "skipped" });
    expect(dbMocks.recordSession).toHaveBeenNthCalledWith(1, 7, 12, "completed", JSON.stringify(workout));
    expect(dbMocks.recordSession).toHaveBeenNthCalledWith(2, 7, 12, "skipped", JSON.stringify(workout));
  });

  it("imports PDF into a reviewable, not-yet-persisted workout", async () => {
    storageMocks.storagePut.mockResolvedValue({ key: "7/source.pdf", url: "/files/7/source.pdf" });
    llmMocks.extractWorkoutFromPdf.mockResolvedValue({ title: "Importado", focus: "Força", level: "", notes: "", sections: [] });
    const result = await appRouter.createCaller(ctx).workouts.importPdf({ filename: "source.pdf", mimeType: "application/pdf", base64: "cGRm" });
    expect(result.workout).toMatchObject({ title: "Importado", sourceFileKey: "7/source.pdf", sourceFileName: "source.pdf" });
    expect(dbMocks.createWorkout).not.toHaveBeenCalled();
  });
});
