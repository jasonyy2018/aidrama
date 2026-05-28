export const PIPELINE_NODE_IDS = {
  script: "shape:pipeline-script",
  assets: "shape:pipeline-assets",
  scriptPlan: "shape:pipeline-scriptPlan",
  storyboardTable: "shape:pipeline-storyboardTable",
  storyboard: "shape:pipeline-storyboard",
  workbench: "shape:pipeline-workbench",
} as const;

export type PipelineNodeType = (typeof PIPELINE_NODE_IDS)[keyof typeof PIPELINE_NODE_IDS];

export interface AssetItem {
  id: number;
  name: string;
  coverUrl: string | null;
  description: string;
  type: string;
}

export interface ScriptNodeData {
  [key: string]: unknown;
  scriptId: number | null;
  title: string;
  content: string;
  episodeCount: number;
}

export interface AssetsNodeData {
  assets: AssetItem[];
  loading: boolean;
}

export interface ScriptPlanNodeData {
  content: string;
  loading: boolean;
}

export interface StoryboardTableNodeData {
  storyboardId: number | null;
  shotCount: number;
  tableMarkdown: string;
  loading: boolean;
}

export interface StoryboardShotItem {
  id: number;
  shotNumber: string;
  content: string;
  imageUrl: string | null;
  generatedImageUrl: string | null;
  videoUrl: string | null;
  generatedVideoUrl: string | null;
  shotType: string;
  duration: string;
  generationStatus: string;
}

export interface StoryboardNodeData {
  storyboardId: number | null;
  items: StoryboardShotItem[];
  loading: boolean;
}

export interface WorkbenchEpisode {
  id: number;
  episodeNumber: number;
  title: string;
  composedVideoUrl: string | null;
  composeStatus: string;
}

export interface WorkbenchNodeData {
  episodes: WorkbenchEpisode[];
  loading: boolean;
}

export type PipelineNodeData =
  | ScriptNodeData
  | AssetsNodeData
  | ScriptPlanNodeData
  | StoryboardTableNodeData
  | StoryboardNodeData
  | WorkbenchNodeData;

export const PIPELINE_EDGES = [
  { id: "e-script-assets", source: PIPELINE_NODE_IDS.script, target: PIPELINE_NODE_IDS.assets },
  { id: "e-script-scriptPlan", source: PIPELINE_NODE_IDS.script, target: PIPELINE_NODE_IDS.scriptPlan },
  { id: "e-scriptPlan-storyboardTable", source: PIPELINE_NODE_IDS.scriptPlan, target: PIPELINE_NODE_IDS.storyboardTable },
  { id: "e-assets-storyboardTable", source: PIPELINE_NODE_IDS.assets, target: PIPELINE_NODE_IDS.storyboardTable },
  { id: "e-storyboardTable-storyboard", source: PIPELINE_NODE_IDS.storyboardTable, target: PIPELINE_NODE_IDS.storyboard },
  { id: "e-storyboard-workbench", source: PIPELINE_NODE_IDS.storyboard, target: PIPELINE_NODE_IDS.workbench },
] as const;
