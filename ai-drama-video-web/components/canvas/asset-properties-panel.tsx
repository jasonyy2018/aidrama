"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Save, Loader2 } from "lucide-react";
import type { ShapeBindings } from "@/types/canvas";
import type { CharacterAnchorNodeData } from "./nodes/character-anchor-node";

interface CharacterAnchorShape {
  id: string;
  props: CharacterAnchorNodeData & { w: number; h: number };
}

interface AssetPropertiesPanelProps {
  selectedShape: CharacterAnchorShape | null;
  shapeBindings: ShapeBindings;
  onClose: () => void;
  onPropsUpdated: (shapeId: string, shapeType: string, props: Record<string, unknown>) => void;
}

const ASSET_TYPES = ["character", "scene", "prop", "costume", "reference"];

const TYPE_LABELS: Record<string, string> = {
  character: "角色",
  scene: "场景",
  prop: "道具",
  costume: "服装",
  reference: "参考图",
};

export default function AssetPropertiesPanel({
  selectedShape,
  shapeBindings,
  onClose,
  onPropsUpdated,
}: AssetPropertiesPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState("character");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [assetId, setAssetId] = useState<number | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (!selectedShape) return;
    const p = selectedShape.props;
    setName(p.name ?? "");
    setDescription(p.description ?? "");
    setAssetType(p.assetType ?? "character");
    isDirtyRef.current = false;
    setSaveOk(false);

    const binding = shapeBindings[selectedShape.id];
    if (binding?.type === "asset") {
      setAssetId(binding.entityId);
    } else {
      setAssetId(null);
    }
  }, [selectedShape?.id, shapeBindings]);

  const save = useCallback(async () => {
    if (!selectedShape || !assetId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, type: assetType }),
      });
      if (res.ok) {
        onPropsUpdated(selectedShape.id, "character-anchor", { name, description, assetType });
        setSaveOk(true);
        isDirtyRef.current = false;
        setTimeout(() => setSaveOk(false), 2000);
      }
    } catch (err) {
      console.error("[AssetPropertiesPanel] save failed", err);
    } finally {
      setSaving(false);
    }
  }, [selectedShape, assetId, name, description, assetType, onPropsUpdated]);

  const handleChange = useCallback(
    (field: string, value: string) => {
      if (field === "name") setName(value);
      if (field === "description") setDescription(value);
      if (field === "assetType") setAssetType(value);
      isDirtyRef.current = true;
      setSaveOk(false);

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        if (isDirtyRef.current) save();
      }, 1500);
    },
    [save]
  );

  if (!selectedShape) return null;

  const { coverUrl, assetType: rawType } = selectedShape.props;

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
          background: "rgba(14,14,20,0.98)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>
          素材属性
        </span>
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

      {/* ─── 封面图 ─── */}
      <div
        style={{
          height: 160,
          background: coverUrl
            ? `url(${coverUrl}) center/cover no-repeat`
            : "rgba(255,255,255,0.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {!coverUrl && (
          <span style={{ fontSize: 40, opacity: 0.15 }}>
            {rawType === "character" ? "👤" : rawType === "scene" ? "🌄" : rawType === "prop" ? "📦" : "📎"}
          </span>
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

      {/* ─── 表单 ─── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="名称">
          <input
            value={name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="素材名称..."
            style={inputStyle}
          />
        </Field>

        <Field label="类型">
          <select
            value={assetType}
            onChange={(e) => handleChange("assetType", e.target.value)}
            style={selectStyle}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </Field>

        <Field label="描述">
          <textarea
            value={description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            placeholder="素材描述..."
            style={textareaStyle}
          />
        </Field>

        {assetId && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            ID: {assetId}
          </div>
        )}

        {/* 保存按钮 */}
        <button
          onClick={save}
          disabled={saving || !assetId}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            background: saveOk
              ? "rgba(74,222,128,0.15)"
              : "rgba(139,92,246,0.2)",
            border: `1px solid ${saveOk ? "rgba(74,222,128,0.3)" : "rgba(139,92,246,0.35)"}`,
            color: saveOk ? "#4ade80" : "#c4b5fd",
            fontSize: 13,
            fontWeight: 500,
            cursor: saving || !assetId ? "not-allowed" : "pointer",
            opacity: saving || !assetId ? 0.5 : 1,
            transition: "all 0.15s",
            width: "100%",
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saveOk ? "已保存" : "保存"}
        </button>
      </div>
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

const baseControlStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  color: "rgba(255,255,255,0.75)",
  fontSize: 12,
  padding: "6px 8px",
  outline: "none",
  fontFamily: "system-ui, sans-serif",
};

const inputStyle: React.CSSProperties = { ...baseControlStyle };

const textareaStyle: React.CSSProperties = {
  ...baseControlStyle,
  resize: "vertical",
  minHeight: 60,
  lineHeight: 1.5,
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
