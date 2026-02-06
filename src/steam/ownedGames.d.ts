/**
 * Minimal Steam Web API client for owned games.
 */
type OwnedGame = {
    appid: number;
    name?: string;
    playtime_forever?: number;
};
export declare function getOwnedGames(): Promise<OwnedGame[]>;
export {};
//# sourceMappingURL=ownedGames.d.ts.map