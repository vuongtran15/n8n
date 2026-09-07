/**
 * Session ID phải có sau khi đã áp tham số node (và merge JSON nếu bật Load connection fields from input).
 * Không tự lấy từ item trước / không tự sinh GUID — tránh nhập nhằng khi debug workflow.
 */
export function requireSessionIdOrThrow(rawSessionId: string): string {
	const sessionId = rawSessionId.trim();
	if (!sessionId) {
		throw new Error(
			'Bắt buộc nhập sessionId: điền ô Session ID hoặc bật "Load connection fields from input" và có key sessionId trong JSON đầu vào.',
		);
	}
	return sessionId;
}
