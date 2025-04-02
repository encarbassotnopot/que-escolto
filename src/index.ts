/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { CurrentlyPlaying } from 'spotify-types';
import { getBearer } from './spotify-auth';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		switch (url.pathname) {
			case '/spotid': {
				const bearer = await getBearer();
				const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + bearer,
					},
				});
				if (!res.ok || res.status != 200) {
					console.log(`status: ${res.status} ${res.statusText}`);
					console.log(await res.body);
					return new Response('Spotify fetch error', { status: 500 });
				}
				const parsed = await res.json<CurrentlyPlaying>();
				console.log(res);
				return new Response(parsed.item?.uri);
			}
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
