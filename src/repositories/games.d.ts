/**
 * Upsert basic game metadata derived from the OwnedGames Steam endpoint.
 */
export declare function upsertGame(input: {
    appId: number;
    name: string | null;
    playtimeForever: number;
}): Promise<void>;
//# sourceMappingURL=games.d.ts.map