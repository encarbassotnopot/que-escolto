export type { TokenResponse, PlayingInfo };

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string | undefined;
	scope: string;
}

interface PlayingInfo {
	status: 'playing' | 'paused' | 'stopped';
	progress_ms: number;
}
