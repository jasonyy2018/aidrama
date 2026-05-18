import { create } from "zustand";
import type { ScriptNodeData, AssetsNodeData, ScriptPlanNodeData, StoryboardTableNodeData, StoryboardNodeData, WorkbenchNodeData, AssetItem, StoryboardShotItem, WorkbenchEpisode } from "@/types/pipeline";

interface CanvasDataState {
  script: ScriptNodeData;
  assets: AssetsNodeData;
  scriptPlan: ScriptPlanNodeData;
  storyboardTable: StoryboardTableNodeData;
  storyboard: StoryboardNodeData;
  workbench: WorkbenchNodeData;

  setScript: (data: Partial<ScriptNodeData>) => void;
  setAssets: (data: Partial<AssetsNodeData>) => void;
  setScriptPlan: (data: Partial<ScriptPlanNodeData>) => void;
  setStoryboardTable: (data: Partial<StoryboardTableNodeData>) => void;
  setStoryboard: (data: Partial<StoryboardNodeData>) => void;
  setWorkbench: (data: Partial<WorkbenchNodeData>) => void;

  reset: () => void;
}

const initialData = {
  script: { scriptId: null, title: "", content: "", episodeCount: 0 },
  assets: { assets: [] as AssetItem[], loading: false },
  scriptPlan: { content: "", loading: false },
  storyboardTable: { storyboardId: null, shotCount: 0, tableMarkdown: "", loading: false },
  storyboard: { storyboardId: null, items: [] as StoryboardShotItem[], loading: false },
  workbench: { episodes: [] as WorkbenchEpisode[], loading: false },
};

export const useCanvasDataStore = create<CanvasDataState>((set) => ({
  ...initialData,

  setScript: (data) => set((s) => ({ script: { ...s.script, ...data } })),
  setAssets: (data) => set((s) => ({ assets: { ...s.assets, ...data } })),
  setScriptPlan: (data) => set((s) => ({ scriptPlan: { ...s.scriptPlan, ...data } })),
  setStoryboardTable: (data) => set((s) => ({ storyboardTable: { ...s.storyboardTable, ...data } })),
  setStoryboard: (data) => set((s) => ({ storyboard: { ...s.storyboard, ...data } })),
  setWorkbench: (data) => set((s) => ({ workbench: { ...s.workbench, ...data } })),

  reset: () => set({ ...initialData }),
}));
