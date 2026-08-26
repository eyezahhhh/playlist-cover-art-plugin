import { AttributeType, SavedAttribute, SavedAttributeValues } from "@pipe-bomb/plugin-sdk";

export function createAttributeRecord(attributes: SavedAttribute[]) {
	const dictionary: Record<string, SavedAttribute[]> = {};

	for (const attribute of attributes) {
		if (attribute.key in dictionary) {
			dictionary[attribute.key]!.push(attribute);
		} else {
			dictionary[attribute.key] = [attribute];
		}
	}

	const output: Record<string, SavedAttribute> = {};
	for (const [key, list] of Object.entries(dictionary)) {
		const first = list.shift()!;
		const type = first.type;
		if (list.some((attribute) => attribute.type != type)) {
			throw new Error(
				`Attribute list contains multiple values of key "${key}" with different types`,
			);
		}

		for (const entry of list) {
			(first.values as any[]).push(...entry.values);
		}
		output[key] = first;
	}

	return output;
}

export function getAttributeValue<T extends AttributeType>(
	attributes:
		| Record<string, SavedAttribute>
		| SavedAttribute[]
		| null
		| undefined,
	key: string,
	type: T,
): SavedAttributeValues[T] | null {
	if (attributes && Array.isArray(attributes)) {
		attributes = createAttributeRecord(attributes);
	}

	const attribute = attributes?.[key];
	if (attribute?.type == type && attribute.values.length) {
		return attribute.values[0]! as SavedAttributeValues[T];
	}

	return null;
}

export function escapeXml(unsafe: string): string {
	return unsafe.replace(/[<>&'"]/g, (c) => {
		switch (c) {
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case "&":
				return "&amp;";
			case "'":
				return "&apos;";
			case '"':
				return "&quot;";
			default:
				return c;
		}
	});
}
