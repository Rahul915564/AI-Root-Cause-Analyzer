import { Router } from "express";
import { db, analysesTable } from "@workspace/db";
import { AnalyzeErrorBody } from "@workspace/api-zod";
import { analyzeError } from "../lib/analyzer";

const router = Router();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sendEvent(res: import("express").Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// POST /api/analyze/stream — SSE streaming endpoint
router.post("/analyze/stream", async (req, res) => {
  const parseResult = AnalyzeErrorBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Bad Request", message: parseResult.error.message });
    return;
  }

  const { input, inputType, fileName } = parseResult.data;

  if (!input || input.trim().length === 0) {
    res.status(400).json({ error: "Bad Request", message: "Input cannot be empty" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    // Stage 1 — scanning
    sendEvent(res, "stage", { stage: "scanning", message: "Scanning input for error signatures..." });
    await sleep(350);

    // Stage 2 — run the actual analysis
    const result = analyzeError(input);

    sendEvent(res, "stage", { stage: "identified", message: `Identified: ${result.errorType}`, errorType: result.errorType, language: result.language });
    await sleep(300);

    // Stage 3 — scoring
    sendEvent(res, "stage", { stage: "scoring", message: "Calculating confidence score...", confidenceScore: result.confidenceScore, priority: result.priority });
    await sleep(350);

    // Stage 4 — root cause
    sendEvent(res, "stage", { stage: "root_cause", message: "Tracing root cause...", rootCause: result.rootCause });
    await sleep(400);

    // Stage 5 — explanation steps one by one
    sendEvent(res, "stage", { stage: "explanation_start", message: "Building step-by-step explanation..." });
    await sleep(200);

    for (let i = 0; i < result.explanation.length; i++) {
      sendEvent(res, "stage", { stage: "explanation_step", index: i, step: result.explanation[i] });
      await sleep(250);
    }

    // Stage 6 — fixes one by one
    sendEvent(res, "stage", { stage: "fixes_start", message: "Generating fix suggestions..." });
    await sleep(200);

    for (let i = 0; i < result.fixes.length; i++) {
      sendEvent(res, "stage", { stage: "fix", index: i, fix: result.fixes[i] });
      await sleep(300);
    }

    // Stage 7 — links
    sendEvent(res, "stage", { stage: "links", links: result.stackOverflowLinks });
    await sleep(150);

    // Stage 8 — save to DB and send complete
    const inputSnippet = input.substring(0, 200);
    const [saved] = await db
      .insert(analysesTable)
      .values({
        inputSnippet,
        errorType: result.errorType,
        language: result.language,
        rootCause: result.rootCause,
        confidenceScore: result.confidenceScore,
        priority: result.priority,
        explanation: result.explanation,
        fixes: result.fixes,
        stackOverflowLinks: result.stackOverflowLinks,
      })
      .returning();

    sendEvent(res, "complete", {
      id: saved.id,
      ...result,
      analyzedAt: saved.analyzedAt.toISOString(),
    });

    res.write("event: done\ndata: {}\n\n");
  } catch (err) {
    req.log.error({ err }, "Streaming analysis failed");
    sendEvent(res, "error", { message: "Analysis failed" });
  } finally {
    res.end();
  }
});

export default router;
