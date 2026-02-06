/**
 * Minimal Steam Web API client for player achievements.
 */
function requireEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing ${name} in environment.`);
    return v;
}
export async function getPlayerAchievements(appId) {
    const key = requireEnv("STEAM_API_KEY");
    const steamid = requireEnv("STEAM_STEAMID64");
    const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/` +
        `?appid=${encodeURIComponent(appId)}` +
        `&key=${encodeURIComponent(key)}` +
        `&steamid=${encodeURIComponent(steamid)}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Steam API failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json());
    const ps = data.playerstats;
    if (!ps)
        throw new Error("Unexpected Steam response: missing playerstats.");
    if (ps.error)
        throw new Error(`Steam API error: ${ps.error}`);
    return {
        steamID: ps.steamID ?? null,
        gameName: ps.gameName ?? null,
        achievements: ps.achievements ?? [],
    };
}
//# sourceMappingURL=client.js.map