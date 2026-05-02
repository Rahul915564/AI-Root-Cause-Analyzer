import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  inputSnippet: text("input_snippet").notNull(),
  errorType: text("error_type").notNull(),
  language: text("language").notNull(),
  rootCause: text("root_cause").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  priority: text("priority").notNull(),
  explanation: jsonb("explanation").notNull().$type<string[]>(),
  fixes: jsonb("fixes").notNull().$type<Array<{ title: string; description: string; codeSnippet?: string; language?: string }>>(),
  stackOverflowLinks: jsonb("stack_overflow_links").notNull().$type<Array<{ title: string; url: string }>>(),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, analyzedAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
