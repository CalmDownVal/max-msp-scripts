// filterdesign alternative with more shapes
//
// inlets:
// - 1			... commands
//
// outlets:
// - 1			... cascade coefficients
//
// Always announce the current sample rate via `sr <rate>` first!
//
// Then send in a list of shapes to the inlet with their parameters in the format:
// `<shape> <freq> <reso> <gain>`
//
// some filters ignore reso or gain values
// multiple definitions may be sent in at once
//
// available filters:
// - lp1		... 1st-order low pass (freq)
// - lp2		... 2nd-order low pass (freq, reso)
// - hp1		... 1st-order high pass (freq)
// - hp2		... 2nd-order high pass (freq, reso)
// - ls1		... 1st-order low shelf (freq, gain)
// - ls2		... 2nd-order low shelf (freq, reso, gain)
// - hs1		... 1st-order high shelf (freq, gain)
// - hs2		... 2nd-order high shelf (freq, reso, gain)
// - pn2		... 2nd-order peak-notch (freq, reso, gain)
//
// example:
// `hp2 50. 0.71 0. pn2 440. 3.2 6.`

let SAMPLE_RATE = 44100.0;

function sr(rate: number) {
	if (!Number.isFinite(rate) || rate <= 10.0) {
		return;
	}

	SAMPLE_RATE = rate;
}

function anything() {
	const list = arrayfromargs(messagename, arguments);
	const result: number[] = [];

	let i = 0;
	let c;
	let type;
	let freq;
	let reso;
	let gain;

	while (i < list.length) {
		type = list[i++] as string;
		freq = list[i++] as number;
		reso = list[i++] as number;
		gain = list[i++] as number;

		if (!(
			FILTER_DEFS[type] &&
			Number.isFinite(freq) &&
			Number.isFinite(reso) &&
			Number.isFinite(gain)
		)) {
			return;
		}

		c = FILTER_DEFS[type]!(
			clamp(freq,   1.0, 24_000.0),
			clamp(reso,   0.1,     20.0),
			clamp(gain, -72.0,     48.0),
		);

		result.push(c.a0, c.a1, c.a2, c.b1, c.b2);
	}

	outlet(0, result);
}


interface FilterDefinition {
	(freq: number, reso: number, gain: number): FilterCoeffs;
}

interface FilterCoeffs {
	a0: number;
	a1: number;
	a2: number;
	b1: number;
	b2: number;
}

const TAU = 2.0 * Math.PI;
const FILTER_DEFS: { [K in string]?: FilterDefinition } = {

	/** first order low pass */
	lp1: (freq, reso, gain) => {
		const w = TAU * freq / SAMPLE_RATE;
		const g = Math.cos(w) / (1.0 + Math.sin(w));

		const a0 = (1.0 - g) * 0.5;
		return {
			a0,
			a1: a0,
			a2: 0.0,
			b1: -g,
			b2: 0.0,
		};
	},

	/** second order low pass */
	lp2: (freq, reso, gain) => {
		const w = TAU * freq / SAMPLE_RATE;
		const d = Math.sin(w) * 0.5 / reso;
		const b = 0.5 * (1.0 - d) / (1.0 + d);
		const g = (0.5 + b) * Math.cos(w);

		const a0 = (0.5 + b - g) * 0.5;
		return {
			a0: a0,
			a1: a0 * 2.0,
			a2: a0,
			b1: g * -2.0,
			b2: b * 2.0,
		};
	},

	/** first order high pass */
	hp1: (freq, reso, gain) => {
		const w = TAU * freq / SAMPLE_RATE;
		const g = Math.cos(w) / (1.0 + Math.sin(w));

		const a0 = (1.0 + g) * 0.5;
		return {
			a0,
			a1: -a0,
			a2: 0.0,
			b1: -g,
			b2: 0.0,
		};
	},

	/** second order high pass */
	hp2: (freq, reso, gain) => {
		const w = TAU * freq / SAMPLE_RATE;
		const d = Math.sin(w) * 0.5 / reso;
		const b = 0.5 * (1.0 - d) / (1.0 + d);
		const g = (0.5 + b) * Math.cos(w);

		const a0 = (0.5 + b + g) * 0.5;
		return {
			a0: a0,
			a1: a0 * -2.0,
			a2: a0,
			b1: g * -2.0,
			b2: b * 2.0,
		};
	},

	/** first order low shelf */
	ls1: (freq, reso, gain) => {
		const t = Math.tan(TAU * freq / SAMPLE_RATE);
		const g = Math.pow(10.0, gain / 20.0);

		return {
			a0: (t * g + 1.0) / (t + 1.0),
			a1: (t * g - 1.0) / (t + 1.0),
			a2: 0.0,
			b1: (t - 1.0) / (t + 1.0),
			b2: 0.0,
		};
	},

	/** second order low shelf */
	ls2: (freq, reso, gain) => {
		const w = TAU * freq / SAMPLE_RATE;
		const g = Math.pow(10.0, gain / 40.0);
		const alpha = Math.sin(w) / (2.0 * reso);
		const beta = Math.cos(w);
		const adj = 2.0 * Math.sqrt(g) * alpha;

		const norm = 1.0 / (g + 1.0 + (g - 1.0) * beta + adj);
		return {
			a0: g * (g + 1.0 - (g - 1.0) * beta + adj) * norm,
			a1: 2.0 * g * (g - 1.0 - (g + 1.0) * beta) * norm,
			a2: g * (g + 1.0 - (g - 1.0) * beta - adj) * norm,
			b1: -2.0 * (g - 1.0 + (g + 1.0) * beta) * norm,
			b2: (g + 1.0 + (g - 1.0) * beta - adj) * norm,
		};
	},

	/** first order high shelf */
	hs1: (freq, reso, gain) => {
		const t = Math.tan(TAU * freq / SAMPLE_RATE);
		const g = Math.pow(10.0, gain / 20.0);

		return {
			a0: (t + g) / (t + 1.0),
			a1: (t - g) / (t + 1.0),
			a2: 0.0,
			b1: (t - 1.0) / (t + 1.0),
			b2: 0.0,
		};
	},

	/** second order high shelf */
	hs2: (freq, reso, gain) => {
		const w = TAU * freq / SAMPLE_RATE;
		const g = Math.pow(10.0, gain / 40.0);
		const alpha = Math.sin(w) / (2.0 * reso);
		const beta = Math.cos(w);
		const adj = 2.0 * Math.sqrt(g) * alpha;

		const norm = 1.0 / (g + 1.0 - (g - 1.0) * beta + adj);
		return {
			a0: g * (g + 1.0 + (g - 1.0) * beta + adj) * norm,
			a1: -2.0 * g * (g - 1.0 + (g + 1.0) * beta) * norm,
			a2: g * (g + 1.0 + (g - 1.0) * beta - adj) * norm,
			b1: 2.0 * (g - 1.0 - (g + 1.0) * beta) * norm,
			b2: (g + 1.0 - (g - 1.0) * beta - adj) * norm,
		};
	},

	/** second order peak-notch (bell) */
	pn2: (freq, reso, gain) => {
		const w = TAU * freq / SAMPLE_RATE;
		const g = Math.sqrt(Math.pow(10.0, gain / 20.0));
		const alpha = Math.sin(w) / (2.0 * reso);
		const beta = Math.cos(w);

		const norm = 1.0 / (1.0 + alpha / g);
		return {
			a0: (1.0 + alpha * g) * norm,
			a1: -2.0 * beta * norm,
			a2: (1.0 - alpha * g) * norm,
			b1: -2.0 * beta * norm,
			b2: (1.0 - alpha / g) * norm,
		};
	},
};

clamp.local = 1;
function clamp(value: number, min = 0.0, max = 1.0) {
	return value < min ? min : value > max ? max : value;
}
