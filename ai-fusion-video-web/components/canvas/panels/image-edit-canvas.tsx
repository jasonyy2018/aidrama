"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface MaskRegion {
  id: string;
  label: string;
  x: number; y: number; w: number; h: number;
  prompt: string;
  resultImageUrl: string | null;
  generationStatus: "idle" | "generating" | "done" | "error";
}

interface ImageEditCanvasProps {
  open: boolean;
  imageUrl: string | null;
  storyboardItemId: number | null;
  onClose: () => void;
}

let maskIdCounter = 0;

export default function ImageEditCanvas({
  open, imageUrl, storyboardItemId, onClose,
}: ImageEditCanvasProps) {
  const [masks, setMasks] = useState<MaskRegion[]>([]);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageSize, setImageSize] = useState({ w: 500, h: 380 });
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const selectedMask = masks.find(m => m.id === selectedMaskId);

  useEffect(() => {
    if (!open) { setMasks([]); setSelectedMaskId(null); setPromptInput(""); setIsGenerating(false); }
  }, [open]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  }, [imageUrl]);

  const handleAddMask = useCallback(() => {
    maskIdCounter++;
    const offset = (masks.length) * 20;
    const newMask: MaskRegion = {
      id: `mask_${Date.now()}_${maskIdCounter}`,
      label: `区域 ${maskIdCounter}`,
      x: 60 + offset, y: imageSize.h + 30 + offset,
      w: 200, h: 220,
      prompt: "", resultImageUrl: null, generationStatus: "idle",
    };
    setMasks(prev => [...prev, newMask]);
    setSelectedMaskId(newMask.id);
  }, [masks.length, imageSize.h]);

  const handleGenerate = useCallback(async () => {
    if (!selectedMaskId || !promptInput.trim() || !imageUrl) return;
    setIsGenerating(true);
    setMasks(prev => prev.map(m => m.id === selectedMaskId ? { ...m, prompt: promptInput.trim(), generationStatus: "generating" } : m));
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptInput.trim(), imageUrl, storyboardItemId }),
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.url) {
        setMasks(prev => prev.map(m => m.id === selectedMaskId ? { ...m, resultImageUrl: data.data.url, generationStatus: "done" } : m));
      } else {
        setMasks(prev => prev.map(m => m.id === selectedMaskId ? { ...m, generationStatus: "error" } : m));
      }
    } catch {
      setMasks(prev => prev.map(m => m.id === selectedMaskId ? { ...m, generationStatus: "error" } : m));
    } finally {
      setIsGenerating(false);
    }
  }, [selectedMaskId, promptInput, imageUrl, storyboardItemId]);

  const handleDeleteMask = useCallback(() => {
    if (!selectedMaskId) return;
    setMasks(prev => prev.filter(m => m.id !== selectedMaskId));
    setSelectedMaskId(null);
  }, [selectedMaskId]);

  const handleMouseDown = useCallback((e: React.MouseEvent, maskId: string) => {
    e.stopPropagation();
    const mask = masks.find(m => m.id === maskId);
    if (!mask) return;
    setDragging({ id: maskId, startX: e.clientX, startY: e.clientY, origX: mask.x, origY: mask.y });
  }, [masks]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    setMasks(prev => prev.map(m => m.id === dragging.id ? { ...m, x: dragging.origX + dx, y: dragging.origY + dy } : m));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  if (!open || !imageUrl) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        style={{
          width: "90vw", height: "85vh", borderRadius: 16, overflow: "hidden",
          background: "rgba(12,12,18,0.98)", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column", position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>
            图片编辑 · {storyboardItemId ? `镜头 #${storyboardItemId}` : "参考图"}
          </span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>✕</button>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
          background: "rgba(20,20,28,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0,
        }}>
          <button onClick={handleAddMask} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
            border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)",
            color: "#fcd34d", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
            + 添加遮罩区域
          </button>

          {selectedMask && (
            <>
              <input value={promptInput} onChange={e => setPromptInput(e.target.value)} placeholder="输入该区域的生成提示词..."
                disabled={isGenerating} style={{
                  flex: 1, maxWidth: 300, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 10px",
                  fontSize: 11, color: "rgba(255,255,255,0.75)", outline: "none", fontFamily: "inherit",
                }} />
              <button onClick={handleGenerate} disabled={isGenerating || !promptInput.trim()} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
                border: "none", background: isGenerating || !promptInput.trim() ? "rgba(96,165,250,0.2)" : "rgba(96,165,250,0.4)",
                color: isGenerating || !promptInput.trim() ? "rgba(147,197,253,0.3)" : "#93c5fd",
                fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              }}>
                {isGenerating ? "⏳" : "✨"}{isGenerating ? "生成中..." : "生成"}
              </button>
              <button onClick={handleDeleteMask} style={{
                padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)",
                background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}>
                删除
              </button>
            </>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", position: "relative", padding: 16 }}>
          {masks.length === 0 && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12, zIndex: 0,
            }}>
              点击「添加遮罩区域」开始编辑图片
            </div>
          )}

          <div style={{ position: "relative", display: "inline-block" }}>
            <img ref={imgRef} src={imageUrl} alt="source"
              style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 8, display: "block" }}
              onLoad={() => { if (imgRef.current) setImageSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight }); }} />
          </div>

          {/* Results row */}
          {masks.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
              {masks.map(mask => (
                <div key={mask.id} onClick={() => { setSelectedMaskId(mask.id); setPromptInput(mask.prompt); }}
                  style={{
                    width: 200, borderRadius: 10, overflow: "hidden", cursor: "pointer",
                    background: "rgba(30,30,50,0.95)",
                    border: `2px solid ${selectedMaskId === mask.id ? "#8b5cf6" : mask.generationStatus === "generating" ? "#60a5fa" : mask.generationStatus === "done" ? "#4ade80" : "rgba(251,191,36,0.4)"}`,
                    boxShadow: selectedMaskId === mask.id ? "0 0 16px rgba(139,92,246,0.4)" : "0 4px 16px rgba(0,0,0,0.3)",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: mask.generationStatus === "generating" ? "#60a5fa" : mask.generationStatus === "done" ? "#4ade80" : "#fbbf24", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#f4f4f5" }}>{mask.label}</span>
                    {mask.generationStatus === "done" && <span style={{ fontSize: 9, color: "#4ade80", marginLeft: "auto" }}>✓</span>}
                  </div>
                  <div style={{ padding: "6px 10px" }}>
                    <div style={{
                      width: "100%", height: 100, borderRadius: 6,
                      background: mask.resultImageUrl ? `url(${mask.resultImageUrl}) center/cover no-repeat` : "rgba(255,255,255,0.03)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, color: "rgba(255,255,255,0.1)",
                    }}>
                      {mask.generationStatus === "idle" && !mask.resultImageUrl && "⊞"}
                      {mask.generationStatus === "generating" && (
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#60a5fa", animation: "ie-spin 0.8s linear infinite" }} />
                      )}
                      {mask.generationStatus === "error" && <span style={{ fontSize: 10, color: "#f87171" }}>失败</span>}
                    </div>
                    {mask.prompt && (
                      <div style={{ marginTop: 4, padding: 4, borderRadius: 4, background: "rgba(0,0,0,0.2)", fontSize: 9, color: "rgba(255,255,255,0.4)", wordBreak: "break-all" }}>
                        {mask.prompt}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ie-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
