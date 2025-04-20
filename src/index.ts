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
import { playingResponse, lastTrack } from './debugResponse';
import { PlayingInfo } from './interfaces';

function encodeXML(original: string): string {
	return original.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function genPlayerSvg(track: SpotifyApi.TrackObjectFull, info: PlayingInfo) {
	const progress = new Date(info.progress_ms ? info.progress_ms : 0);
	const duration = new Date(track.duration_ms ? track.duration_ms : 0);
	const coverArt = await fetch(track.album.images[1].url).then(
		async (res) => 'data:' + res.headers.get('content-type') + ';base64,' + Buffer.from(await res.arrayBuffer()).toString('base64')
	);
	const progressString: string = progress.getMinutes() + ':' + ('0' + progress.getSeconds()).slice(-2);
	const durationString: string = duration.getMinutes() + ':' + ('0' + duration.getSeconds()).slice(-2);
	const percent = progress.valueOf() / duration.valueOf();
	const songName = track.name;
	const albumName = track.album.name;
	const artistsName = track.artists.map((artist) => artist.name).join(', ');
	const playIcon = `<polygon points="0,0 86.6,50, 0,100" fill="black" transform="translate(-8 -12.5) scale(0.25)"/>`;
	const pauseIcon = `<rect x="-10" y="-12.5" width="7" height="25" fill="black" /><rect x="3" y="-12.5" width="7" height="25" fill="black" />`;
	const stopIcon = `<rect x="-10" y="-10" width="20" height="20" fill="black" />`;

	const playerButton = () => {
		switch (info.status) {
			case 'playing':
				return pauseIcon;
			case 'paused':
				return playIcon;
			case 'stopped':
				return stopIcon;
		}
	};

	const PLAYER_SVG = `<svg viewBox='0 0 800 400' xmlns="http://www.w3.org/2000/svg">

	<rect x="0" y="0" width="100%" height="100%" fill="lightgreen" rx="15" />
	<image x="50" y="50" height="300" width="300" href="${coverArt}"
		clip-path="inset(0% round 15px)" id="cover" />
	<line x1="450" x2="${450 + percent * 300}" y1="275" y2="275" stroke="white" id="bar-done" stroke-width="2" />
	<line x1="${450 + percent * 300}" x2="750" y1="275" y2="275" stroke="grey" id="bar-todo" />
	<circle cx="${450 + percent * 300}" cy="275" r="4" fill="white" id="tack" />
	<text x="450" y="100" text-anchor="start" id="song">${encodeXML(songName)}</text>
	<text x="450" y="150" text-anchor="start" id="album">${encodeXML(albumName)}</text>
	<text x="450" y="200" text-anchor="start" id="artist">${encodeXML(artistsName)}</text>
	<text x="450" y="300" text-anchor="start" id="cur-time">${encodeXML(progressString)}</text>
	<text x="750" y="300" text-anchor="end" id="track-time">${encodeXML(durationString)}</text>
	<g transform="translate(600, 325)" id="pause">
		<circle cx="0" cy="0" r="30" fill="white" id="button" />
		${playerButton()}
	</g>
	</svg>`;
	return new Response(PLAYER_SVG, {
		headers: { 'content-type': 'image/svg+xml', status: '200', 'Cache-Control': 'max-age=0, no-cache, no-store, must-revalidate' },
	});
}

async function getCurrentlyPlaying(env: Env, bearer: string): Promise<SpotifyApi.CurrentlyPlayingResponse | 204> {
	if (env.ENVIRONMENT === 'debug') return playingResponse;

	const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
		method: 'GET',
		headers: {
			Authorization: 'Bearer ' + bearer,
		},
	});
	if (!res.ok) {
		console.error(`status: ${res.status} ${res.statusText}`);
		console.error(await res.text());
		return Promise.reject(new Error('Error fetching current song from Spotify'));
	}
	if (res.status === 204) return 204;
	return await res.json<SpotifyApi.CurrentlyPlayingResponse>();
}

async function getLastTrack(env: Env, bearer: string): Promise<SpotifyApi.TrackObjectFull> {
	if (env.ENVIRONMENT === 'debug') return lastTrack.items[0].track;

	const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
		method: 'GET',
		headers: {
			Authorization: 'Bearer ' + bearer,
		},
	});
	if (!res.ok) {
		console.error(`status: ${res.status} ${res.statusText}`);
		console.error(await res.text());
		return Promise.reject('Error fetching recently played songs from Spotify');
	}
	return (await res.json<SpotifyApi.UsersRecentlyPlayedTracksResponse>()).items[0].track;
}

async function getPlayerTrack(env: Env, bearer: string): Promise<[SpotifyApi.TrackObjectFull, PlayingInfo]> {
	const info: PlayingInfo = { status: 'stopped', progress_ms: 0 };
	const current = await getCurrentlyPlaying(env, bearer);
	if (current !== 204 && current.item?.type === 'track') {
		info.progress_ms = current.progress_ms ? current.progress_ms : 0;
		info.status = current.is_playing ? 'playing' : 'paused';
		return [current.item, info];
	}
	const last = await getLastTrack(env, bearer);
	return [last, info];
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const bearer = await getBearer();
		const [track, info] = await getPlayerTrack(env, bearer);
		return genPlayerSvg(track, info);
	},
} satisfies ExportedHandler<Env>;
