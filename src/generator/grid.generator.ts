import { SavedPlaylist } from "@sdk";
import sharp, { OverlayOptions } from "sharp";
import { Generator } from "./generator.js";

export class GridGenerator extends Generator {
	readonly id = "grid";
	readonly name = "Album Grid";

	async generate(
		playlist: SavedPlaylist,
	): Promise<{ buffer: Buffer; extension: string } | null> {
		const SIZE = 512;

		const covers = await this.getCoverArts(playlist.tracks ?? [], 4);

		if (covers.length >= 4) {
			const image = sharp({
				create: {
					width: SIZE,
					height: SIZE,
					channels: 4,
					background: "#000000",
				},
			});

			const composites: OverlayOptions[] = [];
			for (let i = 0; i < 4; i++) {
				composites.push({
					input: await sharp(covers[i]!.buffer)
						.resize(SIZE / 2, SIZE / 2, {
							fit: "cover",
						})
						.toBuffer(),
					left: ((i % 2) * SIZE) / 2,
					top: (Math.floor(i / 2) * SIZE) / 2,
				});
			}
			const buffer = await image.composite(composites).jpeg().toBuffer();
			return { buffer, extension: "jpg" };
		}

		if (covers.length) {
			const cover = covers[0]!;
			return {
				buffer: cover.buffer,
				extension: cover.extension,
			};
		}

		return null;
	}
}
