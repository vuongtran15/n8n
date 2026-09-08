/**
 * sessionId bắt buộc từ JSON input item (RM Init / output node trước).
 */
export function requireSessionIdOrThrow(rawSessionId: string): string {
	const sessionId = rawSessionId.trim();
	if (!sessionId) {
		throw new Error(
			'Bắt buộc sessionId trong JSON input item (baseUrl, apiKey, sessionId từ RM Init hoặc node trước).',
		);
	}
	return sessionId;
}
