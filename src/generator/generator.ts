import {
	DataClient,
	PlaylistClient,
	SavedPlaylist,
	SavedPlaylistTrack,
} from "@sdk";
import { IMAGE_EXTENSIONS } from "../image-extensions.js";

export abstract class Generator {
	constructor(
		protected readonly dataClient: DataClient,
		protected readonly playlistClient: PlaylistClient,
	) {}

	abstract readonly id: string;
	abstract readonly name: string;

	protected async getCoverArts(tracks: SavedPlaylistTrack[], max: number) {
		const coverArts: {
			uuid: string;
			extension: string;
			buffer: Buffer;
		}[] = [];
		for (const { track } of tracks) {
			if (!track) {
				continue;
			}
			const fullTrack = await this.dataClient.getTrack(
				track.pluginId,
				track.libraryId,
				track.trackId,
				{
					relations: {
						attributes: true,
					},
				},
			);

			for (const attribute of fullTrack?.attributes ?? []) {
				if (coverArts.length >= max) {
					break;
				}

				if (attribute.key == "front" && attribute.type == "buffer") {
					const value = attribute.values[0];
					if (
						value &&
						IMAGE_EXTENSIONS.includes(value.extension.toLowerCase())
					) {
						const buffer = await this.dataClient.getResource(
							value.uuid,
							value.extension,
						);
						if (buffer) {
							coverArts.push({
								uuid: value.uuid,
								extension: value.extension,
								buffer,
							});
							break;
						}
					}
				}
			}
		}

		return coverArts;
	}

	abstract generate(
		playlist: SavedPlaylist,
	): Promise<{ buffer: Buffer; extension: string } | null>;
}
