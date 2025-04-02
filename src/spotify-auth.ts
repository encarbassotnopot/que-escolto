import { env } from 'cloudflare:workers';
import { TokenResponse } from './interfaces';

/**
 * Gets either the current bearer token from the KV (if not expired) or gets a new one by calling {@link refreshToken}
 * @returns A valid bearer token
 */
export async function getBearer(): Promise<string> {
	const bearer = await env.KV.get('bearer');
	if (bearer) return bearer;
	else return await refreshToken();
}

/**
 * Gets a new bearer token by refreshing.
 * If no refresh token is found, calls {@link newAccessToken}
 * The new access and refresh tokens are stored them in the KV.
 * @throws Error if something goes wrong with the request.
 * @returns A new access token
 */
async function refreshToken(): Promise<string> {
	const refresh = await env.KV.get('refresh')!;
	if (!refresh) return await newAccessToken();

	const url = 'https://accounts.spotify.com/api/token';
	const payload: RequestInit = {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			Authorization: 'Basic ' + Buffer.from(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET).toString('base64'),
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refresh,
		}),
	};
	const response = await fetch(url, payload);
	if (!response.ok) {
		console.warn(await response.json());
		return newAccessToken();
	}
	const parsed = await response.json<TokenResponse>();
	env.KV.put('bearer', parsed.access_token, { expirationTtl: parsed.expires_in });
	if (parsed.refresh_token) env.KV.put('refresh', parsed.refresh_token);
	return parsed.access_token;
}

/**
 * Gets a new bearer token by using the user-provided authorization code.
 * The new access and refresh tokens are stored them in the KV.
 * @throws Error if something goes wrong with the request.
 * @returns The new access token
 */
async function newAccessToken(): Promise<string> {
	const url = 'https://accounts.spotify.com/api/token';
	const payload: RequestInit = {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			Authorization: 'Basic ' + Buffer.from(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET).toString('base64'),
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code: env.MY_AUTH_CODE,
			redirect_uri: env.SPOTIFY_CLIENT_ENDPOINT,
		}),
	};
	const response = await fetch(url, payload);
	if (!response.ok) {
		console.error(await response.json());
		throw Error('Error fetching token with auth');
	}
	const parsed = await response.json<TokenResponse>();
	env.KV.put('bearer', parsed.access_token, { expirationTtl: parsed.expires_in });
	if (parsed.refresh_token) env.KV.put('refresh', parsed.refresh_token);
	return parsed.access_token;
}
