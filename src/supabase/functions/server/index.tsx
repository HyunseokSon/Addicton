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

// ============= TEAMS ENDPOINTS =============

// Get all teams
app.get("/make-server-41b22d2d/teams", async (c) => {
  try {
    const teams = await kv.get("teams");
    return c.json(teams || []);
  } catch (error) {
    console.error("Error getting teams:", error);
    return c.json({ error: "Failed to get teams", details: String(error) }, 500);
  }
});

// Add a new team
app.post("/make-server-41b22d2d/teams", async (c) => {
  try {
    const team = await c.req.json();
    
    if (!team || !team.id || !team.playerIds) {
      return c.json({ error: "Invalid team data" }, 400);
    }

    const teams = (await kv.get("teams")) || [];
    const updatedTeams = [...teams, team];
    await kv.set("teams", updatedTeams);
    
    return c.json({ team, success: true });
  } catch (error) {
    console.error("Error adding team:", error);
    return c.json({ error: "Failed to add team", details: String(error) }, 500);
  }
});

// Add multiple teams (batch)
app.post("/make-server-41b22d2d/teams/batch", async (c) => {
  try {
    const body = await c.req.json();
    const { teams: newTeams } = body;
    
    if (!newTeams || !Array.isArray(newTeams)) {
      return c.json({ error: "Invalid teams data" }, 400);
    }

    const teams = (await kv.get("teams")) || [];
    const updatedTeams = [...teams, ...newTeams];
    await kv.set("teams", updatedTeams);
    
    return c.json({ success: true, count: newTeams.length });
  } catch (error) {
    console.error("Error adding teams:", error);
    return c.json({ error: "Failed to add teams", details: String(error) }, 500);
  }
});

// Update a team
app.put("/make-server-41b22d2d/teams/:id", async (c) => {
  try {
    const teamId = c.req.param("id");
    const updates = await c.req.json();
    
    if (!teamId || !updates) {
      return c.json({ error: "Invalid request data" }, 400);
    }

    const teams = (await kv.get("teams")) || [];
    const updatedTeams = teams.map((t: any) =>
      t.id === teamId ? { ...t, ...updates } : t
    );
    await kv.set("teams", updatedTeams);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating team:", error);
    return c.json({ error: "Failed to update team", details: String(error) }, 500);
  }
});

// Delete a team
app.delete("/make-server-41b22d2d/teams/:id", async (c) => {
  try {
    const teamId = c.req.param("id");
    
    if (!teamId) {
      return c.json({ error: "Invalid team ID" }, 400);
    }

    const teams = (await kv.get("teams")) || [];
    const updatedTeams = teams.filter((t: any) => t.id !== teamId);
    await kv.set("teams", updatedTeams);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return c.json({ error: "Failed to delete team", details: String(error) }, 500);
  }
});

// Delete all finished teams
app.delete("/make-server-41b22d2d/teams/finished", async (c) => {
  try {
    const teams = (await kv.get("teams")) || [];
    const updatedTeams = teams.filter((t: any) => t.state !== 'finished');
    await kv.set("teams", updatedTeams);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting finished teams:", error);
    return c.json({ error: "Failed to delete finished teams", details: String(error) }, 500);
  }
});

// ============= ADMIN PASSWORD ENDPOINTS =============

// Initialize admin password (only if not set)
app.post("/make-server-41b22d2d/admin-password/init", async (c) => {
  try {
    const existingPassword = await kv.get("admin_password");
    
    if (existingPassword) {
      return c.json({ message: "Password already initialized" });
    }
    
    // Set default password to "1234"
    await kv.set("admin_password", "1234");
    
    return c.json({ success: true, message: "Password initialized to 1234" });
  } catch (error) {
    console.error("Error initializing admin password:", error);
    return c.json({ error: "Failed to initialize password", details: String(error) }, 500);
  }
});

// Verify admin password
app.post("/make-server-41b22d2d/admin-password/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { password } = body;
    
    if (!password) {
      return c.json({ error: "Password is required" }, 400);
    }
    
    let storedPassword = await kv.get("admin_password");
    
    // If no password set, initialize with default "1234"
    if (!storedPassword) {
      await kv.set("admin_password", "1234");
      storedPassword = "1234";
    }
    
    const isValid = password === storedPassword;
    
    return c.json({ valid: isValid });
  } catch (error) {
    console.error("Error verifying admin password:", error);
    return c.json({ error: "Failed to verify password", details: String(error) }, 500);
  }
});

// Change admin password
app.post("/make-server-41b22d2d/admin-password/change", async (c) => {
  try {
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;
    
    if (!currentPassword || !newPassword) {
      return c.json({ error: "Both current and new passwords are required" }, 400);
    }
    
    if (newPassword.length < 4) {
      return c.json({ error: "New password must be at least 4 characters" }, 400);
    }
    
    let storedPassword = await kv.get("admin_password");
    
    // If no password set, initialize with default "1234"
    if (!storedPassword) {
      await kv.set("admin_password", "1234");
      storedPassword = "1234";
    }
    
    // Verify current password
    if (currentPassword !== storedPassword) {
      return c.json({ error: "Current password is incorrect" }, 401);
    }
    
    // Update to new password
    await kv.set("admin_password", newPassword);
    
    return c.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing admin password:", error);
    return c.json({ error: "Failed to change password", details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);