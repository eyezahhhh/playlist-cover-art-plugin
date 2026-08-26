import { SavedPlaylist } from "@pipe-bomb/plugin-sdk";
import { Generator } from "./generator.js";
import sharp from "sharp";
import { escapeXml, getAttributeValue } from "../utils.js";

function getColorsFromTitle(title: string) {
	const palettes = [
		{ spine: "#D96B27", bg: "#FDFBF7", text: "#2B2B2B", lines: "#D1CFCB" }, // Terracotta & Cream
		{ spine: "#3B584B", bg: "#F5F2EB", text: "#222222", lines: "#C2C0BB" }, // Sage & Parchment
		{ spine: "#2B4C7E", bg: "#F7F9FA", text: "#1A2536", lines: "#D0D6DC" }, // Studio Blue & Ice
		{ spine: "#C29B38", bg: "#FAF6EE", text: "#332C1E", lines: "#E3DEC3" }, // Mustard & Bone
	];

	let hash = 0;
	for (let i = 0; i < title.length; i++) {
		hash = title.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % palettes.length;
	return palettes[index]!;
}

export class CassetteGenerator extends Generator {
	readonly id = "cassette";
	readonly name = "Cassette";

	async generate(
		playlist: SavedPlaylist,
	): Promise<{ buffer: Buffer; extension: string } | null> {
		const SIZE = 1000;

		const playlistTitle =
			getAttributeValue(playlist.attributes, "title", "string") ??
			"Unnamed Playlist";
		const colors = getColorsFromTitle(playlistTitle);

		const spineWidth = 160;
		const maxLines = 15;
		const lineSpacing = 48;
		const startY = 220;

		let trackElements = "";
		if (playlist.tracks) {
			for (let i = 0; i < maxLines; i++) {
				if (i >= playlist.tracks.length) {
					break;
				}
				const track = playlist.tracks[i];
				if (!track?.track) {
					continue;
				}
				const fullTrack = await this.dataClient.getTrack(
					track.track.pluginId,
					track.track.libraryId,
					track.track.trackId,
					{
						relations: {
							attributes: true,
						},
					},
				);
				if (!fullTrack) {
					continue;
				}

				const trackText = getAttributeValue(
					fullTrack.attributes,
					"title",
					"string",
				);
				if (trackText) {
					const currentY = startY + i * lineSpacing;
					const croppedTrackText =
						trackText.length > 48
							? trackText.substring(0, 45) + "..."
							: trackText;

					trackElements += `
      <!-- Track row ${i + 1} -->
      <text x="${spineWidth + 60}" y="${currentY - 12}" font-family="Courier New, Courier, monospace" font-size="24" font-weight="bold" fill="${colors.text}">
        ${escapeXml(croppedTrackText)}
      </text>
      <line x1="${spineWidth + 60}" y1="${currentY}" x2="${SIZE - 60}" y2="${currentY}" stroke="${colors.lines}" stroke-width="2" stroke-dasharray="4 4" />
    `;
				}
			}
		}

		const svgTemplate = `
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <!-- Reusable noise filter to simulate rough paper stock texture -->
      <defs>
        <filter id="paper-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.05 0" in="noise" result="coloredNoise"/>
          <feComposite operator="in" in2="SourceGraphic"/>
        </filter>
      </defs>

      <!-- Main Background Insert Card -->
      <rect width="${SIZE}" height="${SIZE}" fill="${colors.bg}" />
      
      <!-- Left Spine Section Block -->
      <rect width="${spineWidth}" height="${SIZE}" fill="${colors.spine}" />
      
      <!-- Fold Line Matrix (Simulating physical fold indentations) -->
      <line x1="${spineWidth}" y1="0" x2="${spineWidth}" y2="${SIZE}" stroke="#000000" stroke-width="3" opacity="0.15" />
      <line x1="${spineWidth + 15}" y1="0" x2="${spineWidth + 15}" y2="${SIZE}" stroke="#FFFFFF" stroke-width="1" opacity="0.2" />

      <!-- Vertical Spine Text (Rotated -90 degrees around center anchor) -->
      <text x="-500" y="${spineWidth / 2 + 10}" 
            font-family="Courier New, Courier, monospace" 
            font-size="38" 
            font-weight="bold" 
            fill="#FFFFFF" 
            transform="rotate(-90)" 
            text-anchor="middle" 
            letter-spacing="4">
        ${escapeXml(playlistTitle.toUpperCase())}
      </text>

      <!-- Main Body Header Details -->
      <text x="${spineWidth + 60}" y="90" font-family="Courier New, Courier, monospace" font-size="54" font-weight="900" fill="${colors.text}">
        ${escapeXml(playlistTitle.toUpperCase())}
      </text>
      
      <text x="${spineWidth + 60}" y="140" font-family="Courier New, Courier, monospace" font-size="20" font-weight="bold" fill="${colors.spine}" letter-spacing="2">
        TOTAL TRACKS: ${String(playlist.tracks?.length ?? 0).padStart(2, "0")} // SIDE A
      </text>

      <!-- Dynamic Tracklist Grid -->
      ${trackElements}

      <!-- Aesthetic Metadata Block in Bottom Corner -->
      <text x="${SIZE - 60}" y="${SIZE - 40}" font-family="Courier New, Courier, monospace" font-size="14" fill="${colors.lines}" text-anchor="end" letter-spacing="1">
        ${escapeXml(playlist.owner?.username?.toUpperCase() ?? "> SYSTEM <")} // PIPE BOMB
      </text>

      <!-- Overlay Paper Texture across the entire canvas -->
      <rect width="${SIZE}" height="${SIZE}" filter="url(#paper-grain)" pointer-events="none" mix-blend-mode="multiply" />
    </svg>
  `;

		return {
			buffer: await sharp(Buffer.from(svgTemplate)).jpeg().toBuffer(),
			extension: "jpg",
		};
	}
}
