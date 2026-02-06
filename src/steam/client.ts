/**
 * Minimal Steam Web API client for player achievements.
 */

type SteamAchievement = {
  apiname: string;
  achieved: number; // 1 = unlocked, 0 = locked
  unlocktime?: number; // unix seconds (usually present when achieved=1)
};

type GetPlayerAchievementsResponse = {
  playerstats?: {
    steamID?: string;
    gameName?: string;
    achievements?: SteamAchievement[];
    error?: string;
  };
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment.`);
  return v;
}

export async function getPlayerAchievements(appId: number) {
  const key = requireEnv("STEAM_API_KEY");
  const steamid = requireEnv("STEAM_STEAMID64");

  const url =
    `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/` +
    `?appid=${encodeURIComponent(appId)}` +
    `&key=${encodeURIComponent(key)}` +
    `&steamid=${encodeURIComponent(steamid)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam API failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as GetPlayerAchievementsResponse;
  const ps = data.playerstats;

  if (!ps) throw new Error("Unexpected Steam response: missing playerstats.");
  if (ps.error) throw new Error(`Steam API error: ${ps.error}`);

  return {
    steamID: ps.steamID ?? null,
    gameName: ps.gameName ?? null,
    achievements: ps.achievements ?? [],
  };
}
