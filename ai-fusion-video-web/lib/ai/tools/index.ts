import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { scripts, assets, storyboardItems, storyboards, agentConversations } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

const extractScriptSchema = z.object({
  plotSummary: z.string().describe("A concise summary of the core plot."),
  characters: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    })
  ).describe("List of main characters in the story."),
  scenes: z.array(
    z.object({
      location: z.string(),
      timeOfDay: z.string(),
      action: z.string(),
    })
  ).describe("List of key scenes."),
});

const generateShotListSchema = z.object({
  sceneLocation: z.string().describe("The location of the scene to generate shots for."),
  shots: z.array(
    z.object({
      shotType: z.string().describe("Camera shot type (e.g., Close-up, Wide shot)."),
      description: z.string().describe("What is happening in this shot."),
      durationEstimate: z.number().describe("Estimated duration in seconds."),
    })
  ).describe("The generated list of shots."),
});

export function getScriptTools(context: {
  projectId?: number;
  storyboardId?: number | null;
  conversationId?: string;
}) {
  return {
    extractScript: tool({
      description: "Extract the core plot, characters, and scenes from a raw story text.",
      parameters: extractScriptSchema,
      // @ts-expect-error - Vercel AI SDK type inference quirk
      execute: async (args: z.infer<typeof extractScriptSchema>) => {
        const { plotSummary, characters, scenes } = args;

        try {
          // Resolve actual projectId
          let actualProjectId = context.projectId;
          if (!actualProjectId && context.conversationId) {
            const conv = await db.query.agentConversations.findFirst({
              where: eq(agentConversations.conversationId, context.conversationId),
            });
            if (conv?.projectId) {
              actualProjectId = conv.projectId;
            }
          }

          if (!actualProjectId) {
            console.error("[extractScript] Missing projectId context");
            return {
              success: false,
              message: "Missing project ID context. Could not save to database.",
            };
          }

          // 1. Save or update Script in DB
          const existingScript = await db.query.scripts.findFirst({
            where: and(
              eq(scripts.projectId, actualProjectId),
              eq(scripts.deleted, 0)
            ),
          });

          let scriptId: number;

          if (existingScript) {
            scriptId = existingScript.id;
            await db.update(scripts).set({
              storySynopsis: plotSummary,
              charactersJson: characters,
              updateTime: new Date(),
            }).where(eq(scripts.id, existingScript.id));
          } else {
            const inserted = await db.insert(scripts).values({
              projectId: actualProjectId,
              title: "AI 提取剧本",
              storySynopsis: plotSummary,
              charactersJson: characters,
              aiGenerated: 1,
              parsingStatus: 2,
            }).returning({ id: scripts.id });
            scriptId = inserted[0]?.id;
          }

          // 2. Save characters to Assets table
          for (const char of characters) {
            const existingAsset = await db.query.assets.findFirst({
              where: and(
                eq(assets.projectId, actualProjectId),
                eq(assets.type, "character"),
                eq(assets.name, char.name),
                eq(assets.deleted, 0)
              ),
            });

            if (existingAsset) {
              await db.update(assets).set({
                description: char.description,
                updateTime: new Date(),
              }).where(eq(assets.id, existingAsset.id));
            } else {
              await db.insert(assets).values({
                projectId: actualProjectId,
                type: "character",
                name: char.name,
                description: char.description,
                sourceType: 1, // AI Generated
              });
            }
          }

          // 3. Save unique scene locations to Assets table
          const uniqueLocations = Array.from(new Set(scenes.map((s) => s.location)));
          for (const loc of uniqueLocations) {
            const existingLocAsset = await db.query.assets.findFirst({
              where: and(
                eq(assets.projectId, actualProjectId),
                eq(assets.type, "scene"),
                eq(assets.name, loc),
                eq(assets.deleted, 0)
              ),
            });

            if (!existingLocAsset) {
              await db.insert(assets).values({
                projectId: actualProjectId,
                type: "scene",
                name: loc,
                sourceType: 1, // AI Generated
              });
            }
          }

          console.log("[extractScript] Successfully saved script and assets to DB for projectId:", actualProjectId);

          return {
            success: true,
            message: "Script extracted and saved successfully to database.",
            scriptId,
            characterCount: characters.length,
            sceneCount: uniqueLocations.length,
          };
        } catch (error: any) {
          console.error("[extractScript] Error saving to database:", error);
          return {
            success: false,
            message: `Failed to save script to database: ${error.message}`,
          };
        }
      },
    }),

    generateShotList: tool({
      description: "Generate a list of storyboard shots for a specific scene.",
      parameters: generateShotListSchema,
      // @ts-expect-error - Vercel AI SDK type inference quirk
      execute: async (args: z.infer<typeof generateShotListSchema>) => {
        const { sceneLocation, shots } = args;

        try {
          // Resolve actual storyboardId
          let actualStoryboardId = context.storyboardId;
          if (!actualStoryboardId && context.conversationId) {
            const conv = await db.query.agentConversations.findFirst({
              where: eq(agentConversations.conversationId, context.conversationId),
            });
            if (conv?.contextType === "storyboard" && conv.contextId) {
              actualStoryboardId = conv.contextId;
            } else if (conv?.projectId) {
              const sb = await db.query.storyboards.findFirst({
                where: and(
                  eq(storyboards.projectId, conv.projectId),
                  eq(storyboards.deleted, 0)
                ),
              });
              if (sb) {
                actualStoryboardId = sb.id;
              }
            }
          }

          if (!actualStoryboardId) {
            console.error("[generateShotList] Missing storyboardId context");
            return {
              success: false,
              message: "Missing storyboard context. Could not save shots to database.",
            };
          }

          // Fetch existing shots to compute sortOrder and shotNumber sequence
          const existingItems = await db.query.storyboardItems.findMany({
            where: and(
              eq(storyboardItems.storyboardId, actualStoryboardId),
              eq(storyboardItems.deleted, 0)
            ),
            orderBy: [asc(storyboardItems.sortOrder)],
          });

          const lastSortOrder = existingItems.length > 0 ? (existingItems[existingItems.length - 1].sortOrder ?? 0) : 0;
          let currentSortOrder = lastSortOrder + 1;
          let currentShotNum = existingItems.length > 0 ? existingItems.length + 1 : 1;

          const insertedIds: number[] = [];

          // Bulk insert shots into database
          for (const shot of shots) {
            const inserted = await db.insert(storyboardItems).values({
              storyboardId: actualStoryboardId,
              sortOrder: currentSortOrder++,
              shotNumber: String(currentShotNum++),
              shotType: shot.shotType,
              content: shot.description,
              duration: String(shot.durationEstimate),
              aiGenerated: 1,
            }).returning({ id: storyboardItems.id });

            if (inserted[0]?.id) {
              insertedIds.push(inserted[0].id);
            }
          }

          console.log(`[generateShotList] Successfully inserted ${shots.length} shots into storyboardId:`, actualStoryboardId);

          return {
            success: true,
            shotCount: shots.length,
            message: `Shots successfully generated and appended to the storyboard in the database.`,
            insertedIds,
          };
        } catch (error: any) {
          console.error("[generateShotList] Error inserting shots into DB:", error);
          return {
            success: false,
            message: `Failed to insert shots into database: ${error.message}`,
          };
        }
      },
    }),
  };
}
