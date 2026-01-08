import { createClient } from "npm:@supabase/supabase-js";

// Create a singleton Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ============= MEMBERS =============

export async function getAllMembers() {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Database error getting members:", error);
    throw new Error(`Failed to get members: ${error.message}`);
  }

  return data || [];
}

export async function addMember(member: any) {
  const { data, error } = await supabase
    .from("members")
    .insert([member])
    .select()
    .single();

  if (error) {
    console.error("Database error adding member:", error);
    throw new Error(`Failed to add member: ${error.message}`);
  }

  return data;
}

export async function updateMember(id: string, updates: any) {
  const { error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Database error updating member:", error);
    throw new Error(`Failed to update member: ${error.message}`);
  }
}

export async function deleteMember(id: string) {
  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Database error deleting member:", error);
    throw new Error(`Failed to delete member: ${error.message}`);
  }
}

export async function batchAddMembers(members: any[]) {
  const { data, error } = await supabase
    .from("members")
    .insert(members)
    .select();

  if (error) {
    console.error("Database error batch adding members:", error);
    throw new Error(`Failed to batch add members: ${error.message}`);
  }

  return data;
}

export async function deleteAllMembers() {
  const { error } = await supabase
    .from("members")
    .delete()
    .neq("id", ""); // Delete all rows

  if (error) {
    console.error("Database error deleting all members:", error);
    throw new Error(`Failed to delete all members: ${error.message}`);
  }
}

export async function resetMembers(newMembers: any[]) {
  // Delete all and insert new ones in a transaction-like manner
  await deleteAllMembers();
  if (newMembers.length > 0) {
    return await batchAddMembers(newMembers);
  }
  return [];
}

// ============= PLAYERS =============

export async function getAllPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Database error getting players:", error);
    throw new Error(`Failed to get players: ${error.message}`);
  }

  return data || [];
}

export async function addPlayer(player: any) {
  const { data, error } = await supabase
    .from("players")
    .insert([player])
    .select()
    .single();

  if (error) {
    console.error("Database error adding player:", error);
    throw new Error(`Failed to add player: ${error.message}`);
  }

  return data;
}

export async function batchAddPlayers(players: any[]) {
  const { data, error } = await supabase
    .from("players")
    .insert(players)
    .select();

  if (error) {
    console.error("Database error batch adding players:", error);
    throw new Error(`Failed to batch add players: ${error.message}`);
  }

  return data;
}

export async function updatePlayer(id: string, updates: any) {
  const { error } = await supabase
    .from("players")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Database error updating player:", error);
    throw new Error(`Failed to update player: ${error.message}`);
  }
}

export async function batchUpdatePlayers(playerUpdates: Array<{ playerId: string; updates: any }>) {
  // Supabase doesn't have a native batch update, so we'll do them in parallel
  const promises = playerUpdates.map(({ playerId, updates }) =>
    supabase.from("players").update(updates).eq("id", playerId)
  );

  const results = await Promise.all(promises);

  // Check for errors
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error("Database errors during batch update:", errors);
    throw new Error(`Failed to batch update players: ${errors[0].error?.message}`);
  }
}

export async function deletePlayer(id: string) {
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Database error deleting player:", error);
    throw new Error(`Failed to delete player: ${error.message}`);
  }
}

export async function batchDeletePlayers(playerIds: string[]) {
  const { error } = await supabase
    .from("players")
    .delete()
    .in("id", playerIds);

  if (error) {
    console.error("Database error batch deleting players:", error);
    throw new Error(`Failed to batch delete players: ${error.message}`);
  }
}

export async function resetPlayerGameCounts() {
  const { error } = await supabase
    .from("players")
    .update({
      game_count: 0,
      last_game_end_at: null,
      teammate_history: {},
      recent_teammates: [],
    })
    .neq("id", ""); // Update all rows

  if (error) {
    console.error("Database error resetting game counts:", error);
    throw new Error(`Failed to reset game counts: ${error.message}`);
  }
}

// ============= TEAMS =============

export async function getAllTeams() {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Database error getting teams:", error);
    throw new Error(`Failed to get teams: ${error.message}`);
  }

  return data || [];
}

export async function addTeam(team: any) {
  const { data, error } = await supabase
    .from("teams")
    .insert([team])
    .select()
    .single();

  if (error) {
    console.error("Database error adding team:", error);
    throw new Error(`Failed to add team: ${error.message}`);
  }

  return data;
}

export async function batchAddTeams(teams: any[]) {
  const { data, error } = await supabase
    .from("teams")
    .insert(teams)
    .select();

  if (error) {
    console.error("Database error batch adding teams:", error);
    throw new Error(`Failed to batch add teams: ${error.message}`);
  }

  return data;
}

export async function updateTeam(id: string, updates: any) {
  const { error } = await supabase
    .from("teams")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Database error updating team:", error);
    throw new Error(`Failed to update team: ${error.message}`);
  }
}

export async function deleteTeam(id: string) {
  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Database error deleting team:", error);
    throw new Error(`Failed to delete team: ${error.message}`);
  }
}

export async function batchDeleteTeams(teamIds: string[]) {
  const { error } = await supabase
    .from("teams")
    .delete()
    .in("id", teamIds);

  if (error) {
    console.error("Database error batch deleting teams:", error);
    throw new Error(`Failed to batch delete teams: ${error.message}`);
  }
}

export async function deleteFinishedTeams() {
  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("state", "finished");

  if (error) {
    console.error("Database error deleting finished teams:", error);
    throw new Error(`Failed to delete finished teams: ${error.message}`);
  }
}

export async function deleteAllTeams() {
  const { error } = await supabase
    .from("teams")
    .delete()
    .neq("id", ""); // Delete all rows

  if (error) {
    console.error("Database error deleting all teams:", error);
    throw new Error(`Failed to delete all teams: ${error.message}`);
  }
}

// ============= SETTINGS =============

export async function getSetting(key: string) {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error) {
    // If not found, return null instead of throwing
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Database error getting setting:", error);
    throw new Error(`Failed to get setting: ${error.message}`);
  }

  return data?.value || null;
}

export async function setSetting(key: string, value: string) {
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) {
    console.error("Database error setting value:", error);
    throw new Error(`Failed to set setting: ${error.message}`);
  }
}