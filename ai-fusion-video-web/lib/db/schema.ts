import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
  numeric,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// sys_user — 用户表
// ============================================================
export const users = pgTable(
  "sys_user",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    username: varchar("username", { length: 64 }).notNull(),
    password: varchar("password", { length: 128 }).notNull(),
    nickname: varchar("nickname", { length: 64 }),
    avatar: varchar("avatar", { length: 512 }),
    email: varchar("email", { length: 128 }),
    phone: varchar("phone", { length: 20 }),
    status: integer("status").default(1).notNull(),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [uniqueIndex("username").on(t.username)]
);

// ============================================================
// sys_role — 角色表
// ============================================================
export const roles = pgTable(
  "sys_role",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    sort: integer("sort").default(0),
    status: integer("status").default(1).notNull(),
    remark: varchar("remark", { length: 512 }),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [uniqueIndex("code_idx").on(t.code)]
);

// ============================================================
// sys_user_role — 用户角色关联表
// ============================================================
export const userRoles = pgTable(
  "sys_user_role",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    roleId: bigint("role_id", { mode: "number" }).notNull(),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [unique("uk_user_role").on(t.userId, t.roleId)]
);

// ============================================================
// afv_project — 项目表
// ============================================================
export const projects = pgTable("afv_project", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  coverUrl: varchar("cover_url", { length: 1024 }),
  scope: integer("scope").default(2),
  ownerType: integer("owner_type").notNull(),
  ownerId: bigint("owner_id", { mode: "number" }).notNull(),
  status: integer("status").default(0),
  properties: jsonb("properties"),
  artStyle: varchar("art_style", { length: 64 }),
  artStyleDescription: text("art_style_description"),
  artStyleImagePrompt: text("art_style_image_prompt"),
  artStyleImageUrl: varchar("art_style_image_url", { length: 1024 }),
  deleted: smallint("deleted").default(0).notNull(),
  createTime: timestamp("create_time").default(sql`now()`).notNull(),
  updateTime: timestamp("update_time").default(sql`now()`).notNull(),
});

// ============================================================
// afv_script — 剧本表
// ============================================================
export const scripts = pgTable(
  "afv_script",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    title: varchar("title", { length: 256 }),
    content: text("content"),
    rawContent: text("raw_content"),
    totalEpisodes: integer("total_episodes").default(0),
    storySynopsis: text("story_synopsis"),
    charactersJson: jsonb("characters_json"),
    sourceType: integer("source_type").default(0),
    parsingStatus: integer("parsing_status").default(0),
    parsingProgress: varchar("parsing_progress", { length: 256 }),
    summary: text("summary"),
    genre: varchar("genre", { length: 128 }),
    targetAudience: varchar("target_audience", { length: 128 }),
    durationEstimate: integer("duration_estimate"),
    scope: integer("scope").default(3),
    ownerType: integer("owner_type"),
    ownerId: bigint("owner_id", { mode: "number" }),
    aiGenerated: smallint("ai_generated").default(0),
    version: integer("version").default(0),
    status: integer("status").default(0),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [index("idx_script_project").on(t.projectId)]
);

// ============================================================
// afv_storyboard — 分镜表
// ============================================================
export const storyboards = pgTable(
  "afv_storyboard",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }),
    scriptId: bigint("script_id", { mode: "number" }),
    title: varchar("title", { length: 256 }),
    description: text("description"),
    customColumns: jsonb("custom_columns"),
    scope: integer("scope").default(3),
    ownerType: integer("owner_type"),
    ownerId: bigint("owner_id", { mode: "number" }),
    totalDuration: integer("total_duration"),
    status: integer("status").default(0),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [index("idx_storyboard_project").on(t.projectId)]
);

// ============================================================
// afv_storyboard_episode — 分镜集表
// ============================================================
export const storyboardEpisodes = pgTable(
  "afv_storyboard_episode",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    storyboardId: bigint("storyboard_id", { mode: "number" }).notNull(),
    episodeNumber: integer("episode_number"),
    title: varchar("title", { length: 200 }),
    synopsis: text("synopsis"),
    sortOrder: integer("sort_order").default(0),
    status: integer("status").default(0),
    composedVideoUrl: varchar("composed_video_url", { length: 1024 }),
    composeStatus: integer("compose_status").default(0),
    composeErrorMsg: text("compose_error_msg"),
    composedAt: timestamp("composed_at"),
    deleted: smallint("deleted").default(0),
    createTime: timestamp("create_time"),
    updateTime: timestamp("update_time"),
  },
  (t) => [index("idx_sb_episode_storyboard").on(t.storyboardId)]
);

// ============================================================
// afv_storyboard_scene — 分镜场次表
// ============================================================
export const storyboardScenes = pgTable(
  "afv_storyboard_scene",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    episodeId: bigint("episode_id", { mode: "number" }).notNull(),
    storyboardId: bigint("storyboard_id", { mode: "number" }).notNull(),
    sceneNumber: varchar("scene_number", { length: 20 }),
    sceneHeading: varchar("scene_heading", { length: 200 }),
    location: varchar("location", { length: 200 }),
    timeOfDay: varchar("time_of_day", { length: 20 }),
    intExt: varchar("int_ext", { length: 20 }),
    sortOrder: integer("sort_order").default(0),
    status: integer("status").default(0),
    deleted: smallint("deleted").default(0),
    createTime: timestamp("create_time"),
    updateTime: timestamp("update_time"),
  },
  (t) => [
    index("idx_sb_scene_episode").on(t.episodeId),
    index("idx_sb_scene_storyboard").on(t.storyboardId),
  ]
);

// ============================================================
// afv_storyboard_item — 分镜条目表（ShotCard 的数据源）
// ============================================================
export const storyboardItems = pgTable(
  "afv_storyboard_item",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    storyboardId: bigint("storyboard_id", { mode: "number" }).notNull(),
    storyboardEpisodeId: bigint("storyboard_episode_id", { mode: "number" }),
    storyboardSceneId: bigint("storyboard_scene_id", { mode: "number" }),
    sortOrder: integer("sort_order").default(0),
    shotNumber: varchar("shot_number", { length: 32 }),
    autoShotNumber: varchar("auto_shot_number", { length: 32 }),
    imageUrl: varchar("image_url", { length: 1024 }),
    referenceImageUrl: varchar("reference_image_url", { length: 1024 }),
    videoUrl: varchar("video_url", { length: 1024 }),
    generatedImageUrl: varchar("generated_image_url", { length: 1024 }),
    generatedVideoUrl: varchar("generated_video_url", { length: 1024 }),
    videoPrompt: text("video_prompt"),
    shotType: varchar("shot_type", { length: 32 }),
    duration: varchar("duration", { length: 20 }),
    content: text("content"),
    sceneExpectation: text("scene_expectation"),
    sound: text("sound"),
    dialogue: text("dialogue"),
    soundEffect: varchar("sound_effect", { length: 512 }),
    music: varchar("music", { length: 512 }),
    cameraMovement: varchar("camera_movement", { length: 64 }),
    cameraAngle: varchar("camera_angle", { length: 64 }),
    cameraEquipment: varchar("camera_equipment", { length: 64 }),
    focalLength: varchar("focal_length", { length: 64 }),
    transition: varchar("transition", { length: 64 }),
    characterIds: jsonb("character_ids"),
    sceneAssetItemId: bigint("scene_asset_item_id", { mode: "number" }),
    propIds: text("prop_ids"),
    remark: text("remark"),
    customData: jsonb("custom_data"),
    aiGenerated: smallint("ai_generated").default(0),
    status: integer("status").default(0),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [
    index("idx_sb_item_storyboard").on(t.storyboardId),
    index("idx_sb_item_scene").on(t.storyboardSceneId),
    index("idx_sb_item_episode").on(t.storyboardEpisodeId),
  ]
);

// ============================================================
// afv_asset — 资产表（CharacterAnchor 的数据源）
// ============================================================
export const assets = pgTable(
  "afv_asset",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }),
    projectId: bigint("project_id", { mode: "number" }),
    type: varchar("type", { length: 32 }),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    coverUrl: varchar("cover_url", { length: 1024 }),
    properties: jsonb("properties"),
    tags: jsonb("tags"),
    sourceType: integer("source_type").default(1),
    aiPrompt: text("ai_prompt"),
    ownerType: integer("owner_type"),
    ownerId: bigint("owner_id", { mode: "number" }),
    status: integer("status").default(1),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [
    index("idx_asset_project").on(t.projectId),
    index("idx_asset_type").on(t.projectId, t.type),
  ]
);

// ============================================================
// afv_canvas_snapshot — 画布快照表（新增）
// 存储 tldraw 的视觉布局（位置、连线、缩放）
// 业务数据（prompt、imageUrl 等）依然在 storyboard_item
// ============================================================
export const canvasSnapshots = pgTable(
  "afv_canvas_snapshot",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    storyboardId: bigint("storyboard_id", { mode: "number" }),
    /** tldraw 完整 snapshot JSON（包含 shapes、bindings、schema） */
    snapshot: jsonb("snapshot").notNull(),
    /** 画布视口状态 { x, y, zoom } */
    viewport: jsonb("viewport"),
    /**
     * shape_bindings: { [shapeId]: { type: 'storyboard_item' | 'asset', entityId: number } }
     * 记录每个 Shape 关联的业务实体，实现双视图同步
     */
    shapeBindings: jsonb("shape_bindings"),
    createdBy: bigint("created_by", { mode: "number" }),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [
    index("idx_canvas_project").on(t.projectId),
    index("idx_canvas_storyboard").on(t.storyboardId),
  ]
);

// ============================================================
// afv_system_config — 系统配置表
// ============================================================
export const systemConfigs = pgTable(
  "afv_system_config",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    configKey: varchar("config_key", { length: 128 }).notNull(),
    configValue: text("config_value"),
    remark: varchar("remark", { length: 256 }),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [unique("uk_config_key").on(t.configKey)]
);

// ============================================================
// afv_ai_model — AI 模型表
// ============================================================
export const aiModels = pgTable("afv_ai_model", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  modelType: integer("model_type").notNull(),
  icon: varchar("icon", { length: 512 }),
  description: varchar("description", { length: 1024 }),
  sort: integer("sort").default(0),
  status: integer("status").default(1).notNull(),
  config: text("config"),
  defaultModel: smallint("default_model").default(0),
  maxConcurrency: integer("max_concurrency").default(5),
  apiConfigId: bigint("api_config_id", { mode: "number" }),
  supportVision: smallint("support_vision").default(0),
  supportReasoning: smallint("support_reasoning").default(0),
  contextWindow: integer("context_window"),
  deleted: smallint("deleted").default(0).notNull(),
  createTime: timestamp("create_time").default(sql`now()`).notNull(),
  updateTime: timestamp("update_time").default(sql`now()`).notNull(),
});

// ============================================================
// afv_api_config — API 配置表
// ============================================================
export const apiConfigs = pgTable("afv_api_config", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  platform: varchar("platform", { length: 32 }),
  apiType: integer("api_type"),
  apiUrl: varchar("api_url", { length: 512 }),
  apiKey: varchar("api_key", { length: 512 }),
  appId: varchar("app_id", { length: 128 }),
  appSecret: text("app_secret"),
  modelId: bigint("model_id", { mode: "number" }),
  status: integer("status").default(1).notNull(),
  remark: varchar("remark", { length: 1024 }),
  deleted: smallint("deleted").default(0).notNull(),
  createTime: timestamp("create_time").default(sql`now()`).notNull(),
  updateTime: timestamp("update_time").default(sql`now()`).notNull(),
});

// ============================================================
// afv_storage_config — 存储配置表
// ============================================================
export const storageConfigs = pgTable("afv_storage_config", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  endpoint: varchar("endpoint", { length: 512 }),
  bucketName: varchar("bucket_name", { length: 128 }),
  accessKey: varchar("access_key", { length: 256 }),
  secretKey: varchar("secret_key", { length: 256 }),
  region: varchar("region", { length: 64 }),
  basePath: varchar("base_path", { length: 256 }),
  customDomain: varchar("custom_domain", { length: 512 }),
  isDefault: smallint("is_default").default(0).notNull(),
  status: integer("status").default(1).notNull(),
  remark: varchar("remark", { length: 1024 }),
  deleted: smallint("deleted").default(0).notNull(),
  createTime: timestamp("create_time").default(sql`now()`).notNull(),
  updateTime: timestamp("update_time").default(sql`now()`).notNull(),
});

// ============================================================
// afv_agent_conversation — Agent 对话表
// ============================================================
export const agentConversations = pgTable(
  "afv_agent_conversation",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 64 }).notNull(),
    userId: bigint("user_id", { mode: "number" }),
    projectId: bigint("project_id", { mode: "number" }),
    contextType: varchar("context_type", { length: 50 }),
    agentType: varchar("agent_type", { length: 64 }),
    category: varchar("category", { length: 32 }),
    contextId: bigint("context_id", { mode: "number" }),
    title: varchar("title", { length: 255 }).default("新对话"),
    messageCount: integer("message_count").default(0),
    lastMessageTime: timestamp("last_message_time"),
    status: varchar("status", { length: 32 }),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [
    uniqueIndex("conversation_id_idx").on(t.conversationId),
    index("idx_conv_project_context").on(t.projectId, t.contextType, t.contextId),
    index("idx_conv_user").on(t.userId),
  ]
);

// ============================================================
// afv_agent_message — Agent 消息表
// ============================================================
export const agentMessages = pgTable(
  "afv_agent_message",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 64 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content"),
    referencesJson: text("references_json"),
    toolName: varchar("tool_name", { length: 100 }),
    toolStatus: varchar("tool_status", { length: 20 }),
    toolCallId: varchar("tool_call_id", { length: 128 }),
    parentToolCallId: varchar("parent_tool_call_id", { length: 128 }),
    reasoningContent: text("reasoning_content"),
    reasoningDurationMs: bigint("reasoning_duration_ms", { mode: "number" }),
    messageOrder: integer("message_order").notNull(),
    deleted: smallint("deleted").default(0).notNull(),
    createTime: timestamp("create_time").default(sql`now()`).notNull(),
    updateTime: timestamp("update_time").default(sql`now()`).notNull(),
  },
  (t) => [
    index("idx_msg_conversation").on(t.conversationId),
    index("idx_msg_conv_order").on(t.conversationId, t.messageOrder),
  ]
);

// ============================================================
// Relations（用于类型安全的 JOIN 查询）
// ============================================================
export const projectsRelations = relations(projects, ({ many }) => ({
  storyboards: many(storyboards),
  scripts: many(scripts),
  assets: many(assets),
  canvasSnapshots: many(canvasSnapshots),
}));

export const storyboardsRelations = relations(storyboards, ({ one, many }) => ({
  project: one(projects, { fields: [storyboards.projectId], references: [projects.id] }),
  episodes: many(storyboardEpisodes),
  items: many(storyboardItems),
  canvasSnapshot: many(canvasSnapshots),
}));

export const storyboardEpisodesRelations = relations(storyboardEpisodes, ({ one, many }) => ({
  storyboard: one(storyboards, { fields: [storyboardEpisodes.storyboardId], references: [storyboards.id] }),
  scenes: many(storyboardScenes),
}));

export const storyboardScenesRelations = relations(storyboardScenes, ({ one, many }) => ({
  episode: one(storyboardEpisodes, { fields: [storyboardScenes.episodeId], references: [storyboardEpisodes.id] }),
  items: many(storyboardItems),
}));

export const storyboardItemsRelations = relations(storyboardItems, ({ one }) => ({
  storyboard: one(storyboards, { fields: [storyboardItems.storyboardId], references: [storyboards.id] }),
  scene: one(storyboardScenes, { fields: [storyboardItems.storyboardSceneId], references: [storyboardScenes.id] }),
  episode: one(storyboardEpisodes, { fields: [storyboardItems.storyboardEpisodeId], references: [storyboardEpisodes.id] }),
}));

export const canvasSnapshotsRelations = relations(canvasSnapshots, ({ one }) => ({
  project: one(projects, { fields: [canvasSnapshots.projectId], references: [projects.id] }),
  storyboard: one(storyboards, { fields: [canvasSnapshots.storyboardId], references: [storyboards.id] }),
}));

// ============================================================
// TypeScript 类型导出
// ============================================================
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Script = typeof scripts.$inferSelect;
export type Storyboard = typeof storyboards.$inferSelect;
export type StoryboardEpisode = typeof storyboardEpisodes.$inferSelect;
export type StoryboardScene = typeof storyboardScenes.$inferSelect;
export type StoryboardItem = typeof storyboardItems.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type CanvasSnapshot = typeof canvasSnapshots.$inferSelect;
export type AiModel = typeof aiModels.$inferSelect;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type AgentConversation = typeof agentConversations.$inferSelect;

export type NewProject = typeof projects.$inferInsert;
export type NewStoryboard = typeof storyboards.$inferInsert;
export type NewStoryboardItem = typeof storyboardItems.$inferInsert;
export type NewCanvasSnapshot = typeof canvasSnapshots.$inferInsert;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
