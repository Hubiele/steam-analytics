/**
 * Minimal Steam Web API client for owned games.
 */

type OwnedGame = {
  appid: number;
  name?: string;
  playtime_forever?: number;
};

type GetOwnedGamesResponse = {
  response?: {
    game_count?: number;
    games?: OwnedGame[];
  };
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment.`);
  return v;
}

export async function getOwnedGames() {
  const key = requireEnv("STEAM_API_KEY");
  const steamid = requireEnv("STEAM_STEAMID64");

  const url =
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/` +
    `?key=${encodeURIComponent(key)}` +
    `&steamid=${encodeURIComponent(steamid)}` +
    `&include_appinfo=1` +
    `&include_played_free_games=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Steam OwnedGames failed: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as GetOwnedGamesResponse;
  return data.response?.games ?? [];
}
