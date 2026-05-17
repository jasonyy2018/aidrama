"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Play, Sparkles, Loader2, CheckCircle, AlertCircle, Eye, Download, RefreshCw } from "lucide-react";
import { storyboardApi, type StoryboardEpisode } from "@/lib/api/storyboard";
import { usePipelineStore } from "@/lib/store/pipeline-store";
import { resolveMediaUrl } from "@/lib/api/client";
import { VideoPreviewDialog } from "@/components/dashboard/video-preview-dialog";
import { composeStatusLabel, composeStatusColor, numericToComposeStatus, episodeToWorkbench } from "./nodes/workbench-node";
import type { WorkbenchEpisode } from "@/types/pipeline";

interface WorkbenchDialogProps {
  open: boolean;
  projectId: number;
  storyboardId: number | null;
  onClose: () => void;
  onEpisodesUpdated: (episodes: WorkbenchEpisode[]) => void;
}

export default function WorkbenchDialog({
  open, projectId, storyboardId, onClose, onEpisodesUpdated,
}: WorkbenchDialogProps) {
  const [episodes, setEpisodes] = useState<StoryboardEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const [composingIds, setComposingIds] = useState<Set<number>>(new Set());
  const [batchComposing, setBatchComposing] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);

  const { attachTaskStream, addSimpleTask, markSimpleTask, setNotificationOpen, setPanelExpanded } = usePipelineStore();

  const loadEpisodes = useCallback(async () => {
    if (!storyboardId) return;
    setLoading(true);
    try {
      const episodes = await storyboardApi.listEpisodes(storyboardId);
      setEpisodes(episodes);
      onEpisodesUpdated(episodes.map(episodeToWorkbench));
    } catch (err) {
      console.error("[workbench] load episodes failed", err);
    } finally {
      setLoading(false);
    }
  }, [storyboardId, onEpisodesUpdated]);

  useEffect(() => {
    if (open && storyboardId) loadEpisodes();
  }, [open, storyboardId, loadEpisodes]);

  const handleCompose = useCallback(async (episode: StoryboardEpisode) => {
    const epLabel = `第${episode.episodeNumber ?? ""}集${episode.title ? ` · ${episode.title}` : ""}`;
    setComposingIds(prev => new Set(prev).add(episode.id));
    try {
      const taskId = await storyboardApi.composeEpisodeVideo(episode.id);
      attachTaskStream({
        label: `合成本集视频：${epLabel}`,
        projectId,
        taskId,
        cancellable: false,
        onSettled: () => {
          void loadEpisodes();
        },
      });
      setNotificationOpen(true);
    } catch (err) {
      console.error("[workbench] compose failed", err);
    } finally {
      setComposingIds(prev => { const next = new Set(prev); next.delete(episode.id); return next; });
    }
  }, [projectId, attachTaskStream, setNotificationOpen, loadEpisodes]);

  const handleBatchCompose = useCallback(async () => {
    setBatchComposing(true);
    const idleOrError = episodes.filter(
      e => e.composeStatus === 0 || e.composeStatus === 3
    );
    if (idleOrError.length === 0) {
      setBatchComposing(false);
      return;
    }
    const taskId = `batch_compose_${Date.now()}`;
    addSimpleTask({
      label: `批量合成视频（${idleOrError.length}集）`,
      projectId,
      initialNote: `正在提交 ${idleOrError.length} 集合成任务...`,
    });
    setNotificationOpen(true);
    setPanelExpanded(true);

    let doneCount = 0;
    for (const ep of idleOrError) {
      setComposingIds(prev => new Set(prev).add(ep.id));
      try {
        const tid = await storyboardApi.composeEpisodeVideo(ep.id);
        await attachTaskStream({
          label: `第${ep.episodeNumber ?? ""}集合成`,
          projectId,
          taskId: tid,
          cancellable: false,
          onSettled: () => {
            doneCount++;
            if (doneCount >= idleOrError.length) {
              markSimpleTask(taskId, { status: "done", resultText: `全部 ${idleOrError.length} 集合成完成` });
              setBatchComposing(false);
              void loadEpisodes();
            }
          },
        });
      } catch {
        doneCount++;
        if (doneCount >= idleOrError.length) {
          markSimpleTask(taskId, { status: "error", errorText: "部分合成失败" });
          setBatchComposing(false);
          void loadEpisodes();
        }
      } finally {
        setComposingIds(prev => { const next = new Set(prev); next.delete(ep.id); return next; });
      }
    }
  }, [episodes, projectId, attachTaskStream, addSimpleTask, markSimpleTask, setNotificationOpen, setPanelExpanded, loadEpisodes]);

  if (!open) return null;

  const readyCount = episodes.filter(e => e.composeStatus === 2).length;

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "85vw", maxWidth: 720, maxHeight: "80vh",
            borderRadius: 16, overflow: "hidden",
            background: "rgba(14,14,20,0.98)", border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", flexDirection: "column",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Play size={16} color="#f472b6" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>
                视频装配工作台
              </span>
              {!loading && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>
                  {readyCount}/{episodes.length} 集已完成
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={loadEpisodes} disabled={loading}
                style={{
                  padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent", color: "rgba(255,255,255,0.5)",
                  fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                <RefreshCw size={11} className={loading ? "wb-spin" : ""} /> 刷新
              </button>
              <button onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                <Loader2 size={20} className="wb-spin" style={{ margin: "0 auto 12px" }} />
                加载剧集列表...
              </div>
            ) : episodes.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
                暂无剧集数据
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {episodes.map(ep => {
                  const status = numericToComposeStatus(ep.composeStatus);
                  const color = composeStatusColor(status);
                  const label = composeStatusLabel(status);
                  const isComposing = composingIds.has(ep.id) || batchComposing;
                  return (
                    <div key={ep.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: color, boxShadow: `0 0 8px ${color}66`,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#f4f4f5" }}>
                          第{ep.episodeNumber ?? "?"}集{ep.title ? ` · ${ep.title}` : ""}
                        </div>
                        {ep.composeErrorMsg && (
                          <div style={{ fontSize: 10, color: "#f87171", marginTop: 2 }}>
                            {ep.composeErrorMsg}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color, flexShrink: 0 }}>{label}</span>

                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {ep.composeStatus === 2 && ep.composedVideoUrl && (
                          <button onClick={() => ep.composedVideoUrl && setPreviewVideo({ url: ep.composedVideoUrl, title: `第${ep.episodeNumber ?? ""}集${ep.title ? ` · ${ep.title}` : ""}` })}
                            style={{
                              display: "flex", alignItems: "center", gap: 3,
                              padding: "4px 8px", borderRadius: 6, border: "none",
                              background: "rgba(74,222,128,0.12)", color: "#4ade80",
                              fontSize: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif",
                            }}
                          >
                            <Eye size={10} /> 预览
                          </button>
                        )}
                        {(ep.composeStatus === 0 || ep.composeStatus === 3) && (
                          <button onClick={() => handleCompose(ep)} disabled={isComposing}
                            style={{
                              display: "flex", alignItems: "center", gap: 3,
                              padding: "4px 8px", borderRadius: 6, border: "none",
                              background: isComposing ? "rgba(96,165,250,0.15)" : "rgba(96,165,250,0.2)",
                              color: isComposing ? "rgba(147,197,253,0.4)" : "#93c5fd",
                              fontSize: 10, cursor: isComposing ? "default" : "pointer",
                              fontFamily: "system-ui, sans-serif",
                            }}
                          >
                            {isComposing ? <Loader2 size={10} className="wb-spin" /> : <Sparkles size={10} />}
                            {isComposing ? "合成中..." : "合成"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Batch footer */}
          {!loading && episodes.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: 11, color: "rgba(255,255,255,0.4)",
            }}>
              <span>
                已完成 {readyCount}/{episodes.length} 集
              </span>
              <button onClick={handleBatchCompose} disabled={batchComposing || episodes.every(e => e.composeStatus === 2 || e.composeStatus === 1)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(244,114,182,0.3)",
                  background: batchComposing ? "rgba(244,114,182,0.08)" : "rgba(244,114,182,0.12)",
                  color: batchComposing ? "rgba(249,168,212,0.4)" : "#f9a8d4",
                  fontSize: 11, fontWeight: 500, cursor: batchComposing ? "default" : "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {batchComposing ? <Loader2 size={11} className="wb-spin" /> : <Sparkles size={11} />}
                {batchComposing ? "批量合成中..." : "批量合成未完成的剧集"}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wb-spin { to { transform: rotate(360deg); } }
        .wb-spin { animation: wb-spin 0.8s linear infinite; }
      `}</style>

      <VideoPreviewDialog
        open={!!previewVideo}
        title={previewVideo?.title ?? ""}
        videoUrl={previewVideo?.url ?? null}
        onClose={() => setPreviewVideo(null)}
      />
    </>
  );
}
