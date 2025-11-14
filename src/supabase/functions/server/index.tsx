import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-41b22d2d/health", (c) => {
  return c.json({ status: "ok" });
});

// Get all members
app.get("/make-server-41b22d2d/members", async (c) => {
  try {
    const members = await kv.get("members");
    return c.json({ members: members || [] });
  } catch (error) {
    console.error("Error getting members:", error);
    return c.json({ error: "Failed to get members", details: String(error) }, 500);
  }
});

// Add a new member
app.post("/make-server-41b22d2d/members", async (c) => {
  try {
    const body = await c.req.json();
    const { member } = body;
    
    if (!member || !member.id || !member.name) {
      return c.json({ error: "Invalid member data" }, 400);
    }

    const members = (await kv.get("members")) || [];
    const updatedMembers = [...members, member];
    await kv.set("members", updatedMembers);
    
    return c.json({ member, success: true });
  } catch (error) {
    console.error("Error adding member:", error);
    return c.json({ error: "Failed to add member", details: String(error) }, 500);
  }
});

// Update a member
app.put("/make-server-41b22d2d/members/:id", async (c) => {
  try {
    const memberId = c.req.param("id");
    const body = await c.req.json();
    const { updates } = body;
    
    if (!memberId || !updates) {
      return c.json({ error: "Invalid request data" }, 400);
    }

    const members = (await kv.get("members")) || [];
    const updatedMembers = members.map((m: any) =>
      m.id === memberId ? { ...m, ...updates } : m
    );
    await kv.set("members", updatedMembers);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating member:", error);
    return c.json({ error: "Failed to update member", details: String(error) }, 500);
  }
});

// Delete a member
app.delete("/make-server-41b22d2d/members/:id", async (c) => {
  try {
    const memberId = c.req.param("id");
    
    if (!memberId) {
      return c.json({ error: "Invalid member ID" }, 400);
    }

    const members = (await kv.get("members")) || [];
    const updatedMembers = members.filter((m: any) => m.id !== memberId);
    await kv.set("members", updatedMembers);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting member:", error);
    return c.json({ error: "Failed to delete member", details: String(error) }, 500);
  }
});

// ============= PLAYERS ENDPOINTS =============

// Get all players
app.get("/make-server-41b22d2d/players", async (c) => {
  try {
    const players = await kv.get("players");
    return c.json(players || []);
  } catch (error) {
    console.error("Error getting players:", error);
    return c.json({ error: "Failed to get players", details: String(error) }, 500);
  }
});

// Add a new player
app.post("/make-server-41b22d2d/players", async (c) => {
  try {
    const player = await c.req.json();
    
    if (!player || !player.id || !player.name) {
      return c.json({ error: "Invalid player data" }, 400);
    }

    const players = (await kv.get("players")) || [];
    const updatedPlayers = [...players, player];
    await kv.set("players", updatedPlayers);
    
    return c.json({ player, success: true });
  } catch (error) {
    console.error("Error adding player:", error);
    return c.json({ error: "Failed to add player", details: String(error) }, 500);
  }
});

// Update a player
app.put("/make-server-41b22d2d/players/:id", async (c) => {
  try {
    const playerId = c.req.param("id");
    const updates = await c.req.json();
    
    if (!playerId || !updates) {
      return c.json({ error: "Invalid request data" }, 400);
    }

    const players = (await kv.get("players")) || [];
    const updatedPlayers = players.map((p: any) =>
      p.id === playerId ? { ...p, ...updates } : p
    );
    await kv.set("players", updatedPlayers);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating player:", error);
    return c.json({ error: "Failed to update player", details: String(error) }, 500);
  }
});

// Delete a player
app.delete("/make-server-41b22d2d/players/:id", async (c) => {
  try {
    const playerId = c.req.param("id");
    
    if (!playerId) {
      return c.json({ error: "Invalid player ID" }, 400);
    }

    const players = (await kv.get("players")) || [];
    const updatedPlayers = players.filter((p: any) => p.id !== playerId);
    await kv.set("players", updatedPlayers);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);
    return c.json({ error: "Failed to delete player", details: String(error) }, 500);
  }
});

// Reset game counts for all players (for 초기화 button)
app.post("/make-server-41b22d2d/players/reset-game-counts", async (c) => {
  try {
    const players = (await kv.get("players")) || [];
    const updatedPlayers = players.map((p: any) => ({
      ...p,
      gameCount: 0,
      lastGameEndAt: null,
      teammateHistory: {},
      recentTeammates: undefined,
    }));
    await kv.set("players", updatedPlayers);
    
    return c.json({ success: true, count: updatedPlayers.length });
  } catch (error) {
    console.error("Error resetting game counts:", error);
    return c.json({ error: "Failed to reset game counts", details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);