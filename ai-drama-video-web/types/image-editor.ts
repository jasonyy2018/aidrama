import type { Node } from "@xyflow/react";

export interface ImageSourceNodeData {
  [key: string]: unknown;
  imageUrl: string | null;
  width: number;
  height: number;
  storyboardItemId: number | null;
}

export interface InpaintMaskNodeData {
  [key: string]: unknown;
  label: string;
  prompt: string;
  x: number;
  y: number;
  width: number;
  height: number;
  resultImageUrl: string | null;
  generationStatus: "idle" | "generating" | "done" | "error";
}

export interface GenResultNodeData {
  [key: string]: unknown;
  imageUrl: string | null;
  maskRegionId: string;
  generationStatus: "idle" | "generating" | "done" | "error";
}

export const IMAGE_EDIT_NODE_IDS = {
  source: "ie-source",
} as const;
