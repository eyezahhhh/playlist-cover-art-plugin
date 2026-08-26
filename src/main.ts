import type PipeBomb from "@pipe-bomb/plugin-sdk";
import { PlaylistCoverArtAttributeSource } from "./playlist-cover-art.attribute-source.js";
import { Generator } from "./generator/generator.js";
import { GridGenerator } from "./generator/grid.generator.js";
import { CassetteGenerator } from "./generator/cassette.generator.js";
import { PlaylistCoverArtUserConfigManager } from "./playlist-cover-art.user-config-manager.js";

export default class Plugin implements PipeBomb.Plugin {
	private api!: PipeBomb.PluginApiContext;
	private logger!: PipeBomb.Logger;

	enable(apiContext: PipeBomb.PluginApiContext) {
		this.api = apiContext;
		this.logger = apiContext.getLogger();

		this.api.registerLanguageDirectory("language");

		const attributeSource = new PlaylistCoverArtAttributeSource();
		this.api.registerAttributeSource(attributeSource);
		const dataClient = this.api.getDataClient();
		const playlistClient = this.api.getPlaylistClient();

		const GENERATORS: readonly Generator[] = [
			new CassetteGenerator(dataClient, playlistClient),
			new GridGenerator(dataClient, playlistClient),
		] as const;

		const config = new PlaylistCoverArtUserConfigManager(
			GENERATORS as Generator[],
		);
		this.api.registerUserConfigManager("generator", config);

		this.api.registerTask({
			id: "generate",
			resumable: false,
			run: async (ctx) => {
				const userCount = await dataClient.getUserCount();
				ctx.update(0);

				let completedUsers = 0;
				await dataClient.forEachUserId(async (userUuid) => {
					const basePercent = completedUsers / userCount;
					ctx.update(basePercent);

					try {
						const generatorId = await config.getGeneratorId(userUuid);
						if (!generatorId) {
							return;
						}
						const generator = GENERATORS.find(
							(generator) => generator.id == generatorId,
						);
						if (!generator) {
							return;
						}

						const playlistIds =
							await playlistClient.getUserPlaylistUuids(userUuid);

						for (const [index, playlistId] of playlistIds.entries()) {
							try {
								const playlist = await playlistClient.getPlaylist(playlistId, {
									relations: {
										tracks: {
											track: true,
										},
										attributes: true,
										owner: true,
									},
								});

								if (playlist) {
									const image = await generator.generate(playlist);
									if (image) {
										await playlistClient.updatePlaylistAttributes(
											playlistId,
											attributeSource.id,
											[
												{
													key: "thumb",
													value: image,
												},
											],
										);
									}
								}
							} catch (e) {
								this.logger.error(
									`Error while generating thumbnail for playlist "${playlistId}":`,
									e,
								);
							} finally {
								ctx.update(
									basePercent + (index + 1) / userCount / playlistIds.length,
								);
							}
						}
					} catch (e) {
						this.logger.error(
							`Error while generating playlist thumbnails for user "${userUuid}":`,
							e,
						);
					} finally {
						completedUsers++;
					}
				});
			},
		});
	}

	disable() {}

	public getLogger() {
		return this.logger;
	}
}
