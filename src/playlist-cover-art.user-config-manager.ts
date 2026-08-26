import {
	ConfigNode,
	UserConfigManager,
	UserConfigManagerApiContext,
} from "@pipe-bomb/plugin-sdk";
import { Generator } from "./generator/generator.js";

export class PlaylistCoverArtUserConfigManager implements UserConfigManager {
	private api!: UserConfigManagerApiContext;

	constructor(private readonly generators: Generator[]) {}

	enable(
		userConfigManagerApiContext: UserConfigManagerApiContext,
	): void | Promise<void> {
		this.api = userConfigManagerApiContext;
	}

	canUserAccess(_userUuid: string): boolean {
		return true;
	}

	public getGeneratorId(userUuid: string) {
		return this.api.getValue(userUuid, "generator", "string");
	}

	async getConfigOptions(userUuid: string): Promise<ConfigNode | null> {
		const generator = await this.getGeneratorId(userUuid);

		return {
			type: "section",
			children: [
				{
					type: "text",
					id: "generator",
					name: "Generator ID",
					placeholder: "grid",
					value: generator ?? "",
				},
			],
		};
	}

	async update(
		userUuid: string,
		values: Record<string, any>,
	): Promise<ConfigNode | null> {
		const { generator } = values;

		if (typeof generator == "string") {
			if (generator.trim()) {
				const generatorObject = this.generators.find(
					(gen) => gen.id == generator,
				);
				if (generatorObject) {
					await this.api.setValue(
						userUuid,
						"generator",
						"string",
						generatorObject.id,
					);
				}
			} else {
				await this.api.delete(userUuid, "generator");
			}
		}

		return this.getConfigOptions(userUuid);
	}
}
