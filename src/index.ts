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

import { getBearer } from './spotify-auth';

async function genPlayerSvg(playing: SpotifyApi.CurrentlyPlayingResponse) {
	if (playing.item?.type !== 'track') return new Response('podcast not supported', { status: 500 });
	const progress = new Date(playing.progress_ms ? playing.progress_ms : 0);
	const duration = new Date(playing.item.duration_ms);
	const coverArt = await fetch(playing.item.album.images[1].url).then(
		async (res) => 'data:' + res.headers.get('content-type') + ';base64,' + Buffer.from(await res.arrayBuffer()).toString('base64')
	);
	const isPlaying = playing.is_playing;
	const progressString: string = progress.getMinutes() + ':' + ('0' + progress.getSeconds()).slice(-2);
	const durationString: string = duration.getMinutes() + ':' + ('0' + duration.getSeconds()).slice(-2);
	const percent = progress.valueOf() / duration.valueOf();
	const songName = playing.item.name;
	const albumName = playing.item.album.name;
	const artistsName = playing.item.artists.map((artist) => artist.name).join(', ');

	const PLAYER_SVG = `<svg viewBox='0 0 800 400' xmlns="http://www.w3.org/2000/svg">

	<rect x="0" y="0" width="100%" height="100%" fill="lightgreen" rx="15" />
	<image x="50" y="50" height="300" width="300" href="${coverArt}"
		clip-path="inset(0% round 15px)" id="cover" />
	<line x1="450" x2="${450 + percent * 300}" y1="275" y2="275" stroke="white" id="bar-done" stroke-width="2" />
	<line x1="${450 + percent * 300}" x2="750" y1="275" y2="275" stroke="grey" id="bar-todo" />
	<circle cx="${450 + percent * 300}" cy="275" r="4" fill="white" id="tack" />
	<text x="450" y="100" text-anchor="start" id="song">${songName}</text>
	<text x="450" y="150" text-anchor="start" id="album">${albumName}</text>
	<text x="450" y="200" text-anchor="start" id="artist">${artistsName}</text>
	<text x="450" y="300" text-anchor="start" id="cur-time">${progressString}</text>
	<text x="750" y="300" text-anchor="end" id="track-time">${durationString}</text>
	<g transform="translate(600, 325)" id="pause">
		<circle cx="0" cy="0" r="30" fill="white" id="button" />
		<rect x="-8" y="-12.5" width="6" height="25" fill=" black" />
		<rect x="3" y="-12.5" width="6" height="25" fill=" black" />
	</g>


</svg>`;
	return new Response(PLAYER_SVG, { headers: { 'content-type': 'image/svg+xml', status: '200' } });
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (['/spotid', '/player', '/coverart'].every((el) => el === request.url)) return new Response('Not Found', { status: 404 });

		const bearer = await getBearer();
		const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
			method: 'GET',
			headers: {
				Authorization: 'Bearer ' + bearer,
			},
		});
		if (!res.ok || res.status != 200) {
			console.log(`status: ${res.status} ${res.statusText}`);
			console.log(await res.text());
			return new Response('Spotify fetch error', { status: 500 });
		}
		const parsed = await res.json<SpotifyApi.CurrentlyPlayingResponse>();
		console.log(res);

		switch (url.pathname) {
			case '/spotid':
				return new Response(parsed.item?.uri);
			case '/player':
				return genPlayerSvg(parsed);
			case '/coverart': {
				switch (parsed.item?.type) {
					case 'track':
						return fetch(parsed.item?.album.images[0].url);
					case 'episode':
						return fetch(parsed.item?.images[0].url);
				}
			}
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
