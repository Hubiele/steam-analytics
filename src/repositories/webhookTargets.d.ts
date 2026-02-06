/**
 * Minimal model for outbound webhook delivery targets.
 */
export type WebhookTarget = {
    id: number;
    url: string;
};
export declare function listWebhookTargets(): Promise<WebhookTarget[]>;
//# sourceMappingURL=webhookTargets.d.ts.map