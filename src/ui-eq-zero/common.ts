export const TAU = 2.0 * Math.PI;

clamp.local = 1;
export function clamp(value: number, min = 0.0, max = 1.0) {
	return value < min ? min : value > max ? max : value;
}
