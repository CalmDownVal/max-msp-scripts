import {
	VISIBLE_FREQ_MAX_EXP,
	VISIBLE_FREQ_MIN_EXP,
	VISIBLE_GAIN_MAX,
	VISIBLE_GAIN_MIN,
	VISIBLE_RESO_MAX_EXP,
	VISIBLE_RESO_MIN_EXP,
	VH,
	VW,
} from "./constants";

clamp.local = 1;
export function clamp(value: number, min = 0.0, max = 1.0) {
	return value < min ? min : value > max ? max : value;
}

x2f.local = 1;
export function x2f(x: number) {
	return Math.pow(10.0, VISIBLE_FREQ_MIN_EXP + clamp(x / VW) * (VISIBLE_FREQ_MAX_EXP - VISIBLE_FREQ_MIN_EXP));
}

f2x.local = 1;
export function f2x(f: number) {
	return VW * (Math.log10(f) - VISIBLE_FREQ_MIN_EXP) / (VISIBLE_FREQ_MAX_EXP - VISIBLE_FREQ_MIN_EXP);
}

y2g.local = 1;
export function y2g(y: number) {
	return VISIBLE_GAIN_MIN + clamp(1.0 - y / VH) * (VISIBLE_GAIN_MAX - VISIBLE_GAIN_MIN);
}

g2y.local = 1;
export function g2y(g: number) {
	return VH * (1.0 - (g - VISIBLE_GAIN_MIN) / (VISIBLE_GAIN_MAX - VISIBLE_GAIN_MIN));
}

y2r.local = 1;
export function y2r(y: number) {
	return Math.pow(10.0, VISIBLE_RESO_MIN_EXP + clamp(1.0 - y / VH) * (VISIBLE_RESO_MAX_EXP - VISIBLE_RESO_MIN_EXP));
}

r2y.local = 1;
export function r2y(r: number) {
	return VH * (1.0 - (Math.log10(r) - VISIBLE_RESO_MIN_EXP) / (VISIBLE_RESO_MAX_EXP - VISIBLE_RESO_MIN_EXP));
}
