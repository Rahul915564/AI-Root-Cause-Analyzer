import { Router } from "express";
import { db, analysesTable } from "@workspace/db";
import { desc, eq, count, avg } from "drizzle-orm";
import { AnalyzeErrorBody, GetHistoryQueryParams, GetAnalysisByIdParams, DeleteAnalysisParams } from "@workspace/api-zod";
import { analyzeError } from "../lib/analyzer";

const router = Router();

// POST /api/analyze
router.post("/analyze", async (req, res) => {
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

  try {
    const result = analyzeError(input);
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

    res.json({
      id: saved.id,
      ...result,
      analyzedAt: saved.analyzedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze error");
    res.status(500).json({ error: "Internal Server Error", message: "Analysis failed" });
  }
});

// GET /api/history
router.get("/history", async (req, res) => {
  const parseResult = GetHistoryQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Bad Request", message: parseResult.error.message });
    return;
  }

  const { errorType, limit = 10 } = parseResult.data;

  try {
    let query = db
      .select()
      .from(analysesTable)
      .orderBy(desc(analysesTable.analyzedAt))
      .limit(limit ?? 10);

    const records = errorType
      ? await db
          .select()
          .from(analysesTable)
          .where(eq(analysesTable.errorType, errorType))
          .orderBy(desc(analysesTable.analyzedAt))
          .limit(limit ?? 10)
      : await query;

    const totalResult = errorType
      ? await db.select({ count: count() }).from(analysesTable).where(eq(analysesTable.errorType, errorType))
      : await db.select({ count: count() }).from(analysesTable);

    const total = totalResult[0]?.count ?? 0;

    res.json({
      records: records.map((r) => ({
        ...r,
        analyzedAt: r.analyzedAt.toISOString(),
      })),
      total,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch history");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch history" });
  }
});

// GET /api/history/:id
router.get("/history/:id", async (req, res) => {
  const parseResult = GetAnalysisByIdParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid ID" });
    return;
  }

  try {
    const [record] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, parseResult.data.id))
      .limit(1);

    if (!record) {
      res.status(404).json({ error: "Not Found", message: "Analysis not found" });
      return;
    }

    res.json({ ...record, analyzedAt: record.analyzedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch analysis");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch analysis" });
  }
});

// DELETE /api/history/:id
router.delete("/history/:id", async (req, res) => {
  const parseResult = DeleteAnalysisParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid ID" });
    return;
  }

  try {
    const deleted = await db
      .delete(analysesTable)
      .where(eq(analysesTable.id, parseResult.data.id))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Not Found", message: "Analysis not found" });
      return;
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete analysis");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete" });
  }
});

// GET /api/stats
router.get("/stats", async (req, res) => {
  try {
    const totalResult = await db.select({ count: count() }).from(analysesTable);
    const totalAnalyses = Number(totalResult[0]?.count ?? 0);

    const avgResult = await db.select({ avg: avg(analysesTable.confidenceScore) }).from(analysesTable);
    const avgConfidence = Math.round(Number(avgResult[0]?.avg ?? 0));

    const criticalResult = await db
      .select({ count: count() })
      .from(analysesTable)
      .where(eq(analysesTable.priority, "Critical"));
    const criticalCount = Number(criticalResult[0]?.count ?? 0);

    const allRecords = await db
      .select({ errorType: analysesTable.errorType })
      .from(analysesTable);

    const breakdown: Record<string, number> = {};
    for (const r of allRecords) {
      breakdown[r.errorType] = (breakdown[r.errorType] ?? 0) + 1;
    }

    const errorTypeBreakdown = Object.entries(breakdown).map(([errorType, count]) => ({
      errorType,
      count,
    }));

    res.json({ totalAnalyses, avgConfidence, criticalCount, errorTypeBreakdown });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch stats");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch stats" });
  }
});

export default router;
