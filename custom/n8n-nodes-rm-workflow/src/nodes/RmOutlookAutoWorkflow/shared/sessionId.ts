/**
 * sessionId bắt buộc từ JSON input item (output node RM OUTLOOK AUTO trước hoặc node Set/Trigger).
 * Không tự sinh GUID — tránh nhập nhằng khi debug workflow.
 */
export function requireSessionIdOrThrow(rawSessionId: string): string {
	const sessionId = rawSessionId.trim();
	if (!sessionId) {
		throw new Error(
			'Bắt buộc sessionId trong JSON input item (baseUrl, apiKey, sessionId từ output node RM OUTLOOK AUTO trước hoặc node cấu hình đầu workflow).',
		);
	}
	return sessionId;
}
