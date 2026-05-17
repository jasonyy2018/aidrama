export const PIPELINE_NODE_IDS = {
  script: "pipeline-script",
  assets: "pipeline-assets",
  scriptPlan: "pipeline-scriptPlan",
  storyboardTable: "pipeline-storyboardTable",
  storyboard: "pipeline-storyboard",
  workbench: "pipeline-workbench",
} as const;

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
  [key: string]: unknown;
  assets: AssetItem[];
  loading: boolean;
}

export interface ScriptPlanNodeData {
  [key: string]: unknown;
  content: string;
  loading: boolean;
}

export interface StoryboardTableNodeData {
  [key: string]: unknown;
  storyboardId: number | null;
  shotCount: number;
  tableMarkdown: string;
  loading: boolean;
}

export interface StoryboardNodeData {
  [key: string]: unknown;
  storyboardId: number | null;
  items: StoryboardShotItem[];
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

export interface WorkbenchNodeData {
  [key: string]: unknown;
  episodes: WorkbenchEpisode[];
  loading: boolean;
}

export interface WorkbenchEpisode {
  id: number;
  episodeNumber: number;
  title: string;
  composedVideoUrl: string | null;
  composeStatus: string;
}

export const PIPELINE_EDGES = [
  { id: "e-script-assets", source: PIPELINE_NODE_IDS.script, target: PIPELINE_NODE_IDS.assets, sourceHandle: "assets", animated: true },
  { id: "e-script-scriptPlan", source: PIPELINE_NODE_IDS.script, target: PIPELINE_NODE_IDS.scriptPlan, sourceHandle: "scriptPlan", animated: true },
  { id: "e-scriptPlan-storyboardTable", source: PIPELINE_NODE_IDS.scriptPlan, target: PIPELINE_NODE_IDS.storyboardTable, animated: true },
  { id: "e-assets-storyboardTable", source: PIPELINE_NODE_IDS.assets, target: PIPELINE_NODE_IDS.storyboardTable, animated: true },
  { id: "e-storyboardTable-storyboard", source: PIPELINE_NODE_IDS.storyboardTable, target: PIPELINE_NODE_IDS.storyboard, animated: true },
  { id: "e-storyboard-workbench", source: PIPELINE_NODE_IDS.storyboard, target: PIPELINE_NODE_IDS.workbench, animated: true },
] as const;
