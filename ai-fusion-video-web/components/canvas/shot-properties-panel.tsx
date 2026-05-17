"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Save, Image as ImageIcon, Video, ChevronDown, ChevronUp, Loader2, ExternalLink } from "lucide-react";
import type { ShotCardShape } from "./shapes/shot-card-shape";
import type { ShapeBindings } from "@/types/canvas";

interface ShotPropertiesPanelProps {
  /** 当前选中的 ShotCard shape */
  selectedShape: ShotCardShape | null;
  /** shape bindings（用于找到关联的 storyboard item id） */
  shapeBindings: ShapeBindings;
  /** 项目 ID */
  projectId: number;
  /** 关闭面板 */
  onClose: () => void;
  /** 属性更新后通知 canvas editor 更新 shape */
  onPropsUpdated: (shapeId: string, props: Partial<ShotCardShape["props"]>) => void;
}

interface FormState {
  content: string;
  sceneExpectation: string;
  shotType: string;
  duration: string;
  dialogue: string;
  cameraMovement: string;
  cameraAngle: string;
  sound: string;
  videoPrompt: string;
  remark: string;
}

const SHOT_TYPES = ["远景", "全景", "中景", "近景", "特写", "主观镜头", "过肩镜头"];
const CAMERA_MOVEMENTS = ["固定", "推", "拉", "摇", "移", "跟", "升", "降", "手持"];
const CAMERA_ANGLES = ["平视", "俯视", "仰视", "斜角"];

export default function ShotPropertiesPanel({
  selectedShape,
  shapeBindings,
  projectId,
  onClose,
  onPropsUpdated,
}: ShotPropertiesPanelProps) {
  const [form, setForm] = useState<FormState>({
    content: "",
    sceneExpectation: "",
    shotType: "中景",
    duration: "3",
    dialogue: "",
    cameraMovement: "固定",
    cameraAngle: "平视",
    sound: "",
    videoPrompt: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("basic");
  const [itemId, setItemId] = useState<number | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  // 同步 shape props 到表单
  useEffect(() => {
    if (!selectedShape) return;

    const p = selectedShape.props;
    setForm({
      content: p.content ?? "",
      sceneExpectation: p.sceneExpectation ?? "",
      shotType: p.shotType ?? "中景",
      duration: p.duration ?? "3",
      dialogue: p.dialogue ?? "",
      cameraMovement: p.cameraMovement ?? "固定",
      cameraAngle: "",
      sound: "",
      videoPrompt: "",
      remark: "",
    });
    isDirtyRef.current = false;
    setSaveOk(false);

    // 查询 storyboard item id
    const binding = shapeBindings[selectedShape.id];
    if (binding?.type === "storyboard_item") {
      setItemId(binding.entityId);
      // 从 API 加载完整字段
      fetch(`/api/storyboard-items/${binding.entityId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.code === 200 && res.data) {
            const d = res.data;
            setForm({
              content: d.content ?? "",
              sceneExpectation: d.sceneExpectation ?? "",
              shotType: d.shotType ?? "中景",
              duration: d.duration ?? "3",
              dialogue: d.dialogue ?? "",
              cameraMovement: d.cameraMovement ?? "固定",
              cameraAngle: d.cameraAngle ?? "平视",
              sound: d.sound ?? "",
              videoPrompt: d.videoPrompt ?? "",
              remark: d.remark ?? "",
            });
          }
        })
        .catch(console.error);
    } else {
      setItemId(null);
    }
  }, [selectedShape?.id, shapeBindings]);

  // 保存到 DB 并同步 shape
  const save = useCallback(async () => {
    if (!selectedShape || !itemId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/storyboard-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        // 更新 Canvas 中的 ShotCard props（避免重新加载整页）
        onPropsUpdated(selectedShape.id, {
          content: form.content,
          sceneExpectation: form.sceneExpectation,
          shotType: form.shotType,
          duration: form.duration,
          dialogue: form.dialogue,
          cameraMovement: form.cameraMovement,
        });
        setSaveOk(true);
        isDirtyRef.current = false;
        setTimeout(() => setSaveOk(false), 2000);
      }
    } catch (err) {
      console.error("[ShotPropertiesPanel] save failed", err);
    } finally {
      setSaving(false);
    }
  }, [selectedShape, itemId, form, onPropsUpdated]);

  // 表单变更 + 自动保存防抖
  const handleChange = useCallback(
    (field: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      isDirtyRef.current = true;
      setSaveOk(false);

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        if (isDirtyRef.current) save();
      }, 1500);
    },
    [save]
  );

  const toggleSection = (key: string) =>
    setExpandedSection((prev) => (prev === key ? null : key));

  if (!selectedShape) return null;

  const { shotNumber, generatedImageUrl, generatedVideoUrl, videoUrl, generationStatus } = selectedShape.props;
  const displayImage = generatedImageUrl || null;
  const displayVideo = videoUrl || generatedVideoUrl || null;

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        background: "rgba(14,14,20,0.96)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        zIndex: 300,
        fontFamily: "system-ui, sans-serif",
        overflowY: "auto",
      }}
    >
      {/* ─── Header ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky",
          top: 0,
          background: "rgba(14,14,20,0.98)",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                generationStatus === "done"
                  ? "#4ade80"
                  : generationStatus === "idle"
                  ? "#52525b"
                  : "#60a5fa",
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>
            {shotNumber ? `镜头 #${shotNumber}` : "镜头属性"}
          </span>
          {itemId && (
            <a
              href={`#`}
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <ExternalLink size={10} />
              #{itemId}
            </a>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={save}
            disabled={saving || !itemId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              background: saveOk
                ? "rgba(74,222,128,0.15)"
                : "rgba(139,92,246,0.2)",
              border: `1px solid ${saveOk ? "rgba(74,222,128,0.3)" : "rgba(139,92,246,0.35)"}`,
              color: saveOk ? "#4ade80" : "#c4b5fd",
              fontSize: 12,
              cursor: saving || !itemId ? "not-allowed" : "pointer",
              opacity: saving || !itemId ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            {saveOk ? "已保存" : "保存"}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ─── 图片/视频预览 ─── */}
      <div
        style={{
          height: 160,
          background: displayImage
            ? `url(${displayImage}) center/cover no-repeat`
            : "rgba(255,255,255,0.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {!displayImage && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              color: "rgba(255,255,255,0.2)",
            }}
          >
            <ImageIcon size={28} />
            <span style={{ fontSize: 11 }}>暂未生成图片</span>
          </div>
        )}
        {displayVideo && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "rgba(0,0,0,0.7)",
              borderRadius: 4,
              padding: "3px 8px",
              fontSize: 11,
              color: "#c4b5fd",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Video size={11} />
            已有视频
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 32,
            background: "linear-gradient(to top, rgba(14,14,20,0.9), transparent)",
          }}
        />
      </div>

      {/* ─── 内容区（可滚动） ─── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 16px" }}>
        {/* 基本信息 */}
        <Section
          title="基本信息"
          id="basic"
          expanded={expandedSection === "basic"}
          onToggle={toggleSection}
        >
          <Field label="画面描述">
            <textarea
              value={form.content}
              onChange={(e) => handleChange("content", e.target.value)}
              rows={3}
              placeholder="描述这个镜头的画面内容..."
              style={textareaStyle}
            />
          </Field>
          <Field label="场景预期">
            <textarea
              value={form.sceneExpectation}
              onChange={(e) => handleChange("sceneExpectation", e.target.value)}
              rows={2}
              placeholder="场景氛围、情感基调..."
              style={textareaStyle}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="景别">
              <select
                value={form.shotType}
                onChange={(e) => handleChange("shotType", e.target.value)}
                style={selectStyle}
              >
                {SHOT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="时长(秒)">
              <input
                type="number"
                min={1}
                max={60}
                value={form.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>
        </Section>

        {/* 摄影参数 */}
        <Section
          title="摄影参数"
          id="camera"
          expanded={expandedSection === "camera"}
          onToggle={toggleSection}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="运镜方式">
              <select
                value={form.cameraMovement}
                onChange={(e) => handleChange("cameraMovement", e.target.value)}
                style={selectStyle}
              >
                {CAMERA_MOVEMENTS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="拍摄角度">
              <select
                value={form.cameraAngle}
                onChange={(e) => handleChange("cameraAngle", e.target.value)}
                style={selectStyle}
              >
                {CAMERA_ANGLES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* 台词与声音 */}
        <Section
          title="台词与声音"
          id="audio"
          expanded={expandedSection === "audio"}
          onToggle={toggleSection}
        >
          <Field label="台词">
            <textarea
              value={form.dialogue}
              onChange={(e) => handleChange("dialogue", e.target.value)}
              rows={2}
              placeholder="角色台词..."
              style={textareaStyle}
            />
          </Field>
          <Field label="声音备注">
            <input
              value={form.sound}
              onChange={(e) => handleChange("sound", e.target.value)}
              placeholder="音效、背景音乐..."
              style={inputStyle}
            />
          </Field>
        </Section>

        {/* AI 生成提示词 */}
        <Section
          title="AI 生成"
          id="ai"
          expanded={expandedSection === "ai"}
          onToggle={toggleSection}
        >
          <Field label="视频提示词">
            <textarea
              value={form.videoPrompt}
              onChange={(e) => handleChange("videoPrompt", e.target.value)}
              rows={3}
              placeholder="AI 视频生成的 Prompt..."
              style={textareaStyle}
            />
          </Field>
          <Field label="备注">
            <textarea
              value={form.remark}
              onChange={(e) => handleChange("remark", e.target.value)}
              rows={2}
              placeholder="创作笔记..."
              style={textareaStyle}
            />
          </Field>
        </Section>
      </div>
    </div>
  );
}

// ─── 子组件 ───

function Section({
  title,
  id,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  id: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <button
        onClick={() => onToggle(id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.5)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        {title}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── 共用样式 ───
const baseControlStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  color: "rgba(255,255,255,0.75)",
  fontSize: 12,
  padding: "6px 8px",
  outline: "none",
  transition: "border-color 0.15s",
  fontFamily: "system-ui, sans-serif",
};

const textareaStyle: React.CSSProperties = {
  ...baseControlStyle,
  resize: "vertical",
  minHeight: 48,
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  ...baseControlStyle,
};

const selectStyle: React.CSSProperties = {
  ...baseControlStyle,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23888' d='M1 3l4 4 4-4H1z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
  paddingRight: 24,
};
