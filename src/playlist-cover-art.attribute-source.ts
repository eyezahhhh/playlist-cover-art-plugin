import {
	AlbumInformationHelper,
	AlbumMetadata,
	ArtistInformationHelper,
	ArtistMetadata,
	AttributeSource,
	AttributeSourceApiContext,
	TrackAttributionHelper,
	TrackMetadata,
} from "@sdk";

export class PlaylistCoverArtAttributeSource implements AttributeSource {
	readonly id = "playlist-cover-art";

	enable(attributeSourceApiContext: AttributeSourceApiContext): void {
		attributeSourceApiContext.registerPlaylistAttributes([
			{
				key: "thumb",
				type: "buffer",
				supportsMultiple: false,
			},
		]);
	}

	getName(): string {
		return "Playlist Cover Art";
	}

	async getTrackAttributeValues(
		_helper: TrackAttributionHelper,
	): Promise<TrackMetadata> {
		return {
			artists: null,
			attributes: null,
		};
	}

	async getArtistAttributeValues(
		_helper: ArtistInformationHelper,
	): Promise<ArtistMetadata> {
		return {
			attributes: null,
		};
	}

	async getAlbumAttributeValues(
		helper: AlbumInformationHelper,
	): Promise<AlbumMetadata> {
		return {
			artists: null,
			attributes: null,
		};
	}
}
