import { listWebhookTargets } from "../repositories/webhookTargets.js";
/**
 * Send the payload to all registered webhook targets.
 */
export async function sendAchievementWebhooks(payload) {
    const targets = await listWebhookTargets();
    const results = await Promise.allSettled(targets.map(async (t) => {
        const res = await fetch(t.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });
        return { targetId: t.id, url: t.url, status: res.status };
    }));
    return results.map((r) => r.status === "fulfilled"
        ? { ok: true, ...r.value }
        : { ok: false, error: String(r.reason) });
}
//# sourceMappingURL=sender.js.map