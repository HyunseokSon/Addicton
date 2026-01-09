import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as db from "./db.tsx";
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

// ⚡ Get all data at once for faster loading
app.get("/make-server-41b22d2d/all-data", async (c) => {
  try {
    const startTime = performance.now();
    const data = await db.getAllData();
    const duration = performance.now() - startTime;
    
    console.log(`⚡ Batch loaded all data in ${duration.toFixed(0)}ms`);
    return c.json(data);
  } catch (error) {
    console.error("Error getting all data:", error);
    return c.json({ error: "Failed to get all data", details: String(error) }, 500);
  }
});

// Get all members
app.get("/make-server-41b22d2d/members", async (c) => {
  try {
    const members = await db.getAllMembers();
    return c.json({ members });
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

    const addedMember = await db.addMember(member);
    
    return c.json({ member: addedMember, success: true });
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

    await db.updateMember(memberId, updates);
    
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

    await db.deleteMember(memberId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting member:", error);
    return c.json({ error: "Failed to delete member", details: String(error) }, 500);
  }
});

// Batch add members
app.post("/make-server-41b22d2d/members/batch", async (c) => {
  try {
    const body = await c.req.json();
    const { members: newMembers } = body;
    
    if (!newMembers || !Array.isArray(newMembers)) {
      return c.json({ error: "Invalid members data" }, 400);
    }

    await db.batchAddMembers(newMembers);
    
    console.log(`✅ Batch added ${newMembers.length} members`);
    return c.json({ success: true, count: newMembers.length });
  } catch (error) {
    console.error("Error batch adding members:", error);
    return c.json({ error: "Failed to batch add members", details: String(error) }, 500);
  }
});

// Delete all members
app.delete("/make-server-41b22d2d/members/all", async (c) => {
  try {
    const members = await db.getAllMembers();
    const count = members.length;
    
    await db.deleteAllMembers();
    
    console.log(`✅ Deleted all ${count} members`);
    return c.json({ success: true, deletedCount: count });
  } catch (error) {
    console.error("Error deleting all members:", error);
    return c.json({ error: "Failed to delete all members", details: String(error) }, 500);
  }
});

// Reset members - delete all and add new ones atomically
app.post("/make-server-41b22d2d/members/reset", async (c) => {
  try {
    const { members: newMembers } = await c.req.json();
    
    if (!newMembers || !Array.isArray(newMembers)) {
      return c.json({ error: "Invalid members array" }, 400);
    }
    
    // Get current count
    const oldMembers = await db.getAllMembers();
    const deletedCount = oldMembers.length;
    
    // Atomic reset: delete all and set new ones
    await db.resetMembers(newMembers);
    
    console.log(`✅ Reset members: deleted ${deletedCount}, added ${newMembers.length}`);
    return c.json({ success: true, deletedCount, addedCount: newMembers.length });
  } catch (error) {
    console.error("Error resetting members:", error);
    return c.json({ error: "Failed to reset members", details: String(error) }, 500);
  }
});

// ============= PLAYERS ENDPOINTS =============

// Get all players
app.get("/make-server-41b22d2d/players", async (c) => {
  try {
    const players = await db.getAllPlayers();
    return c.json(players);
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

    // Filter out client-only fields that don't exist in DB
    const { createdAt, ...dbPlayer } = player;

    const addedPlayer = await db.addPlayer(dbPlayer);
    
    return c.json({ player: addedPlayer, success: true });
  } catch (error) {
    console.error("Error adding player:", error);
    return c.json({ error: "Failed to add player", details: String(error) }, 500);
  }
});

// Add multiple players at once (batch)
app.post("/make-server-41b22d2d/players/batch", async (c) => {
  try {
    const { players: newPlayers } = await c.req.json();
    
    if (!Array.isArray(newPlayers) || newPlayers.length === 0) {
      return c.json({ error: "Invalid players data" }, 400);
    }

    // Validate all players
    for (const player of newPlayers) {
      if (!player || !player.id || !player.name) {
        return c.json({ error: "Invalid player data in batch" }, 400);
      }
    }

    // Filter out client-only fields that don't exist in DB
    const dbPlayers = newPlayers.map(({ createdAt, ...dbPlayer }) => dbPlayer);

    await db.batchAddPlayers(dbPlayers);
    
    console.log(`✅ Batch added ${newPlayers.length} players`);
    return c.json({ success: true, count: newPlayers.length });
  } catch (error) {
    console.error("Error batch adding players:", error);
    return c.json({ error: "Failed to batch add players", details: String(error) }, 500);
  }
});

// Delete multiple players at once (batch)
app.post("/make-server-41b22d2d/players/batch-delete", async (c) => {
  try {
    const { playerIds } = await c.req.json();
    
    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return c.json({ error: "Invalid player IDs" }, 400);
    }

    await db.batchDeletePlayers(playerIds);
    
    console.log(`✅ Batch deleted ${playerIds.length} players`);
    return c.json({ success: true, count: playerIds.length });
  } catch (error) {
    console.error("Error batch deleting players:", error);
    return c.json({ error: "Failed to batch delete players", details: String(error) }, 500);
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

    await db.updatePlayer(playerId, updates);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating player:", error);
    return c.json({ error: "Failed to update player", details: String(error) }, 500);
  }
});

// Batch update players
app.post("/make-server-41b22d2d/players/batch-update", async (c) => {
  try {
    const body = await c.req.json();
    const { playerUpdates } = body;
    
    if (!playerUpdates || !Array.isArray(playerUpdates)) {
      return c.json({ error: "Invalid player updates data" }, 400);
    }

    console.log(`🔄 Batch updating ${playerUpdates.length} players...`);
    
    await db.batchUpdatePlayers(playerUpdates);
    
    console.log(`✅ Successfully batch updated ${playerUpdates.length} players`);
    return c.json({ success: true, count: playerUpdates.length });
  } catch (error) {
    console.error("Error batch updating players:", error);
    return c.json({ error: "Failed to batch update players", details: String(error) }, 500);
  }
});

// Delete a player
app.delete("/make-server-41b22d2d/players/:id", async (c) => {
  try {
    const playerId = c.req.param("id");
    
    if (!playerId) {
      return c.json({ error: "Invalid player ID" }, 400);
    }

    await db.deletePlayer(playerId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);
    return c.json({ error: "Failed to delete player", details: String(error) }, 500);
  }
});

// Reset game counts for all players (for 초기화 button)
app.post("/make-server-41b22d2d/players/reset-game-counts", async (c) => {
  try {
    await db.resetPlayerGameCounts();
    
    const players = await db.getAllPlayers();
    return c.json({ success: true, count: players.length });
  } catch (error) {
    console.error("Error resetting game counts:", error);
    return c.json({ error: "Failed to reset game counts", details: String(error) }, 500);
  }
});

// ============= TEAMS ENDPOINTS =============

// Get all teams
app.get("/make-server-41b22d2d/teams", async (c) => {
  try {
    const teams = await db.getAllTeams();
    return c.json(teams);
  } catch (error) {
    console.error("Error getting teams:", error);
    return c.json({ error: "Failed to get teams", details: String(error) }, 500);
  }
});

// Add a new team
app.post("/make-server-41b22d2d/teams", async (c) => {
  try {
    const team = await c.req.json();
    
    console.log("📥 Received team data:", JSON.stringify(team, null, 2));
    
    if (!team || !team.id || !team.player_ids || !team.name) {
      console.error("❌ Validation failed:", { 
        hasTeam: !!team, 
        hasId: !!team?.id, 
        hasPlayerIds: !!team?.player_ids,
        hasName: !!team?.name,
        team 
      });
      return c.json({ error: "Invalid team data - missing required fields (id, player_ids, or name)" }, 400);
    }

    const addedTeam = await db.addTeam(team);
    
    return c.json({ team: addedTeam, success: true });
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

    // Filter out client-only fields that don't exist in DB
    const dbTeams = newTeams.map(({ assignedCourtId, createdAt, ...dbTeam }) => dbTeam);

    await db.batchAddTeams(dbTeams);
    
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

    await db.updateTeam(teamId, updates);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating team:", error);
    return c.json({ error: "Failed to update team", details: String(error) }, 500);
  }
});

// Delete all finished teams (MUST be before /:id route)
app.delete("/make-server-41b22d2d/teams/finished", async (c) => {
  try {
    await db.deleteFinishedTeams();
    
    console.log(`✅ Deleted finished teams from Supabase`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting finished teams:", error);
    return c.json({ error: "Failed to delete finished teams", details: String(error) }, 500);
  }
});

// Batch delete teams
app.post("/make-server-41b22d2d/teams/batch-delete", async (c) => {
  try {
    const { teamIds } = await c.req.json();
    
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return c.json({ error: "Invalid team IDs" }, 400);
    }

    await db.batchDeleteTeams(teamIds);
    
    console.log(`✅ Batch deleted ${teamIds.length} teams`);
    return c.json({ success: true, count: teamIds.length });
  } catch (error) {
    console.error("Error batch deleting teams:", error);
    return c.json({ error: "Failed to batch delete teams", details: String(error) }, 500);
  }
});

// Delete all teams (for session reset)
app.delete("/make-server-41b22d2d/teams/all", async (c) => {
  try {
    await db.deleteAllTeams();
    console.log("✅ Deleted all teams from Supabase");
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting all teams:", error);
    return c.json({ error: "Failed to delete all teams", details: String(error) }, 500);
  }
});

// Delete a team (MUST be after /finished and /all routes)
app.delete("/make-server-41b22d2d/teams/:id", async (c) => {
  try {
    const teamId = c.req.param("id");
    
    if (!teamId) {
      return c.json({ error: "Invalid team ID" }, 400);
    }

    await db.deleteTeam(teamId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return c.json({ error: "Failed to delete team", details: String(error) }, 500);
  }
});

// ===== SETTINGS CRUD =====

// Get setting
app.get("/make-server-41b22d2d/settings/:key", async (c) => {
  try {
    const key = c.req.param("key");
    
    if (!key) {
      return c.json({ error: "Invalid setting key" }, 400);
    }

    const value = await db.getSetting(key);
    
    return c.json({ key, value });
  } catch (error) {
    console.error("Error getting setting:", error);
    return c.json({ error: "Failed to get setting", details: String(error) }, 500);
  }
});

// Set setting
app.put("/make-server-41b22d2d/settings/:key", async (c) => {
  try {
    const key = c.req.param("key");
    const body = await c.req.json();
    const { value } = body;
    
    if (!key || value === undefined) {
      return c.json({ error: "Invalid request data" }, 400);
    }

    await db.setSetting(key, String(value));
    
    return c.json({ success: true, key, value });
  } catch (error) {
    console.error("Error setting value:", error);
    return c.json({ error: "Failed to set setting", details: String(error) }, 500);
  }
});

// ============= DATA MIGRATION ENDPOINT =============

// Check what's in KV store
app.get("/make-server-41b22d2d/check-kv", async (c) => {
  try {
    console.log("🔍 Checking KV store contents...");
    
    const kvMembers = await kv.get("members");
    const kvPlayers = await kv.get("players");
    const kvTeams = await kv.get("teams");
    const kvAdminPassword = await kv.get("admin_password");
    
    console.log("KV Store contents:", {
      members: kvMembers ? `Found ${Array.isArray(kvMembers) ? kvMembers.length : 'non-array'} members` : 'null',
      players: kvPlayers ? `Found ${Array.isArray(kvPlayers) ? kvPlayers.length : 'non-array'} players` : 'null',
      teams: kvTeams ? `Found ${Array.isArray(kvTeams) ? kvTeams.length : 'non-array'} teams` : 'null',
      admin_password: kvAdminPassword ? 'Found' : 'null',
    });
    
    return c.json({
      success: true,
      kvStore: {
        members: kvMembers,
        players: kvPlayers,
        teams: kvTeams,
        admin_password: kvAdminPassword ? '***' : null,
      },
      counts: {
        members: Array.isArray(kvMembers) ? kvMembers.length : 0,
        players: Array.isArray(kvPlayers) ? kvPlayers.length : 0,
        teams: Array.isArray(kvTeams) ? kvTeams.length : 0,
      }
    });
  } catch (error) {
    console.error("❌ Error checking KV store:", error);
    return c.json({ error: "Failed to check KV store", details: String(error) }, 500);
  }
});

// Migrate data from KV store to new table structure
app.post("/make-server-41b22d2d/migrate-from-kv", async (c) => {
  try {
    console.log("🚀 Starting migration from KV store to new tables...");
    
    // Get data from KV store
    const kvMembers = (await kv.get("members")) || [];
    const kvPlayers = (await kv.get("players")) || [];
    const kvTeams = (await kv.get("teams")) || [];
    const kvAdminPassword = await kv.get("admin_password");
    
    console.log(`📊 Found in KV store: ${kvMembers.length} members, ${kvPlayers.length} players, ${kvTeams.length} teams`);
    
    let migratedCounts = {
      members: 0,
      players: 0,
      teams: 0,
      settings: 0,
    };
    
    // Helper function to convert camelCase to snake_case
    const toSnakeCase = (obj: any) => {
      const converted: any = {};
      for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        converted[snakeKey] = obj[key];
      }
      return converted;
    };
    
    // Migrate members
    if (kvMembers.length > 0) {
      console.log(`🔄 Migrating ${kvMembers.length} members...`);
      await db.deleteAllMembers(); // Clear existing
      
      // Convert camelCase to snake_case
      const convertedMembers = kvMembers.map((member: any) => toSnakeCase(member));
      
      await db.batchAddMembers(convertedMembers);
      migratedCounts.members = kvMembers.length;
      console.log(`✅ Migrated ${kvMembers.length} members`);
    }
    
    // Migrate players
    if (kvPlayers.length > 0) {
      console.log(`🔄 Migrating ${kvPlayers.length} players...`);
      // Clear existing players
      const existingPlayers = await db.getAllPlayers();
      if (existingPlayers.length > 0) {
        await db.batchDeletePlayers(existingPlayers.map((p: any) => p.id));
      }
      
      // Convert camelCase to snake_case
      const convertedPlayers = kvPlayers.map((player: any) => toSnakeCase(player));
      
      await db.batchAddPlayers(convertedPlayers);
      migratedCounts.players = kvPlayers.length;
      console.log(`✅ Migrated ${kvPlayers.length} players`);
    }
    
    // Migrate teams
    if (kvTeams.length > 0) {
      console.log(`🔄 Migrating ${kvTeams.length} teams...`);
      await db.deleteAllTeams(); // Clear existing
      
      // Convert camelCase to snake_case
      const convertedTeams = kvTeams.map((team: any) => toSnakeCase(team));
      
      await db.batchAddTeams(convertedTeams);
      migratedCounts.teams = kvTeams.length;
      console.log(`✅ Migrated ${kvTeams.length} teams`);
    }
    
    // Migrate admin password
    if (kvAdminPassword) {
      console.log(`🔄 Migrating admin password...`);
      await db.setSetting("admin_password", kvAdminPassword);
      migratedCounts.settings = 1;
      console.log(`✅ Migrated admin password`);
    }
    
    console.log("🎉 Migration completed successfully!");
    
    return c.json({
      success: true,
      message: "Data migrated from KV store to new tables",
      migrated: migratedCounts,
    });
  } catch (error) {
    console.error("❌ Error during migration:", error);
    return c.json({ error: "Failed to migrate data", details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);