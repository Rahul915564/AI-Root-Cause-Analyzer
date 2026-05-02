import { useState, useRef, useCallback } from "react";

export interface Fix {
  title: string;
  description: string;
  codeSnippet?: string;
  language?: string;
}

export interface SOLink {
  title: string;
  url: string;
}

export interface StreamingState {
  stage: "idle" | "scanning" | "identified" | "scoring" | "root_cause" | "explanation" | "fixes" | "links" | "complete" | "error";
  stageMessage: string;
  errorType?: string;
  language?: string;
  confidenceScore?: number;
  priority?: "Critical" | "High" | "Medium" | "Low";
  rootCause?: string;
  explanation: string[];
  fixes: Fix[];
  stackOverflowLinks: SOLink[];
  result?: {
    id: number;
    errorType: string;
    language: string;
    rootCause: string;
    confidenceScore: number;
    priority: "Critical" | "High" | "Medium" | "Low";
    explanation: string[];
    fixes: Fix[];
    stackOverflowLinks: SOLink[];
    analyzedAt: string;
  };
  errorMessage?: string;
}

const INITIAL_STATE: StreamingState = {
  stage: "idle",
  stageMessage: "",
  explanation: [],
  fixes: [],
  stackOverflowLinks: [],
};

export function useStreamingAnalysis(onComplete?: () => void) {
  const [state, setState] = useState<StreamingState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (input: string, inputType: "paste" | "file" | "message", fileName?: string) => {
      // Cancel any in-progress stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ ...INITIAL_STATE, stage: "scanning", stageMessage: "Initializing analysis..." });

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}api/analyze/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, inputType, fileName }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const rawData = line.slice(6).trim();
              if (!rawData) continue;
              try {
                const data = JSON.parse(rawData);
                handleEvent(currentEvent, data);
              } catch {
                // ignore malformed JSON
              }
              currentEvent = "";
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          stage: "error",
          stageMessage: "Analysis failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    },
    [],
  );

  function handleEvent(event: string, data: Record<string, unknown>) {
    if (event === "stage") {
      const stage = data.stage as string;

      if (stage === "scanning") {
        setState((prev) => ({ ...prev, stage: "scanning", stageMessage: data.message as string }));
      } else if (stage === "identified") {
        setState((prev) => ({
          ...prev,
          stage: "identified",
          stageMessage: data.message as string,
          errorType: data.errorType as string,
          language: data.language as string,
        }));
      } else if (stage === "scoring") {
        setState((prev) => ({
          ...prev,
          stage: "scoring",
          stageMessage: data.message as string,
          confidenceScore: data.confidenceScore as number,
          priority: data.priority as StreamingState["priority"],
        }));
      } else if (stage === "root_cause") {
        setState((prev) => ({
          ...prev,
          stage: "root_cause",
          stageMessage: data.message as string,
          rootCause: data.rootCause as string,
        }));
      } else if (stage === "explanation_start") {
        setState((prev) => ({
          ...prev,
          stage: "explanation",
          stageMessage: data.message as string,
          explanation: [],
        }));
      } else if (stage === "explanation_step") {
        setState((prev) => ({
          ...prev,
          explanation: [...prev.explanation, data.step as string],
        }));
      } else if (stage === "fixes_start") {
        setState((prev) => ({
          ...prev,
          stage: "fixes",
          stageMessage: data.message as string,
          fixes: [],
        }));
      } else if (stage === "fix") {
        setState((prev) => ({
          ...prev,
          fixes: [...prev.fixes, data.fix as Fix],
        }));
      } else if (stage === "links") {
        setState((prev) => ({
          ...prev,
          stage: "links",
          stackOverflowLinks: data.links as SOLink[],
        }));
      }
    } else if (event === "complete") {
      setState((prev) => ({
        ...prev,
        stage: "complete",
        stageMessage: "Analysis complete",
        result: data as StreamingState["result"],
      }));
      onComplete?.();
    } else if (event === "error") {
      setState((prev) => ({
        ...prev,
        stage: "error",
        stageMessage: "Analysis failed",
        errorMessage: data.message as string,
      }));
    }
  }

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  const isStreaming = state.stage !== "idle" && state.stage !== "complete" && state.stage !== "error";

  return { state, analyze, reset, isStreaming };
}
