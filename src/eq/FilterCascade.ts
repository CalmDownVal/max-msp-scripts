import { clamp, f2x, g2y, r2y, x2f, y2g, y2r } from "./common";
import { FREQ_MAX, FREQ_MIN, GAIN_DEFAULT, GAIN_MAX, GAIN_MIN, MAX_FILTERS, OUT_COEFFS, OUT_STATE, RESO_DEFAULT, RESO_MAX, RESO_MIN, TAU } from "./constants";

export type FilterType = keyof typeof FILTER_DEFS;

export type FilterInit = Pick<Filter, "type" | "freq" | "reso" | "gain">;

export interface Filter {
	dirty: boolean;

	// coeffs
	a0: number;
	a1: number;
	a2: number;
	b1: number;
	b2: number;

	// params
	type: FilterType;
	freq: number;
	reso: number;
	gain: number;

	// cached coords
	x: number;
	y: number;
	z: number;
}

export class FilterCascade {
	private readonly coefficients: number[] = [];
	private readonly filtersOrdered: Filter[] = [];
	private filtersSorted: Filter[] = [];
	private sampleRate = 44100.0;
	private selected = 0;


	public getFilter(n: number = this.selected) {
		if (n < 1 || n > this.filtersOrdered.length) {
			return null;
		}

		return this.filtersOrdered[n - 1];
	}

	public getFiltersOrdered() {
		return this.filtersOrdered;
	}

	public getFiltersSorted() {
		return this.filtersSorted.sort(byFreqAsc);
	}

	public calculateGainAt(freq: number) {
		const { coefficients } = this;
		const { length } = coefficients;
		const omega = TAU * freq / this.sampleRate;
		const co1 = Math.cos(omega);
		const so1 = Math.sin(omega);
		const co2 = Math.cos(omega * 2.0);
		const so2 = Math.sin(omega * 2.0);

		let a0;
		let a1;
		let a2;
		let b1;
		let b2;

		let ca; // FF cosines
		let sa; // FF sines
		let cb; // FB cosines
		let sb; // FB sines

		let index = 0;
		let den;
		let tmpRe;
		let tmpIm;
		let re = 1.0;
		let im = 0.0;

		while (index < length) {
			a0 = coefficients[index++];
			a1 = coefficients[index++];
			a2 = coefficients[index++];
			b1 = coefficients[index++];
			b2 = coefficients[index++];

			ca =  a0 + a1 * co1 + a2 * co2; // first term: a0 * co0 = a0 * cos(0) = a0 -> simplified
			cb = 1.0 + b1 * co1 + b2 * co2; // first term: b0 * co0 =  1 * cos(0) = 1  -> constant
			sa =       a1 * so1 + a2 * so2; // first term: a0 * so0 = a0 * sin(0) = 0  -> omitted
			sb =       b1 * so1 + b2 * so2; // first term: b0 * so0 =  1 * sin(0) = 0  -> omitted

			den = 1.0 / Math.sqrt(cb * cb + sb * sb);
			tmpRe = (re * ca - im * sa) * den;
			tmpIm = (re * sa + im * ca) * den;
			re = tmpRe;
			im = tmpIm;
		}

		return 20.0 * Math.log10(Math.sqrt(re * re + im * im));
	}

	public isKnownType(type: string): type is FilterType {
		return (FILTER_DEFS as Record<string, FilterDefinition | undefined>)[type] !== undefined;
	}

	public outputCoefficients() {
		outlet(OUT_COEFFS, this.coefficients);
	}


	public setSampleRate(rate: number) {
		if (this.sampleRate === rate) {
			return false;
		}

		this.filtersOrdered.forEach(filter => {
			filter.dirty = true;
		});

		this.sampleRate = rate;
		this.recalculate();
		return true;
	}

	public addFilter(type: FilterType, freq: number, reso: number = RESO_DEFAULT, gain: number = GAIN_DEFAULT) {
		if (this.filtersOrdered.length >= MAX_FILTERS) {
			return false;
		}

		const freqClamped = clamp(freq, FREQ_MIN, FREQ_MAX);
		const filter: Filter = {
			dirty: true,
			a0: 0.0,
			a1: 0.0,
			a2: 0.0,
			b1: 0.0,
			b2: 0.0,
			type,
			freq: freqClamped,
			reso: clamp(reso, RESO_MIN, RESO_MAX),
			gain: clamp(gain, GAIN_MIN, GAIN_MAX),
			x: f2x(freqClamped),
			y: 0.0,
			z: 0.0,
		};

		filter.y = getY(filter);
		filter.z = getZ(filter);

		this.filtersOrdered.push(filter);
		this.filtersSorted.push(filter);
		this.recalculate();
		this.selectFilter(this.filtersOrdered.length);

		return true;
	}

	public removeFilter(n: number = this.selected) {
		const current = this.getFilter(n);
		if (!current) {
			return false;
		}

		this.filtersOrdered.splice(n - 1, 1);
		this.filtersSorted = this.filtersOrdered.slice();
		this.recalculate();

		if (this.selected !== n) {
			return true;
		}

		// select closest
		let min = Number.POSITIVE_INFINITY;
		let num = 0;
		this.filtersOrdered.forEach((other, index) => {
			const dx = Math.abs(other.x - current.x);
			const dy = Math.abs(other.y - current.y);
			const ds = dx * dx + dy * dy;
			if (ds < min) {
				min = ds;
				num = index + 1;
			}
		});

		this.selectFilter(num);
		return true;
	}

	public selectFilter(n: number) {
		const filter = this.getFilter(n);
		if (!filter) {
			n = 0;
		}

		if (this.selected === n) {
			return false;
		}

		this.selected = n;
		outlet(OUT_STATE, "select", n);

		if (filter) {
			const def = FILTER_DEFS[filter.type];
			outlet(OUT_STATE, "type", filter.type);
			outlet(OUT_STATE, "freq", filter.freq);
			outlet(OUT_STATE, "reso", def.reso === "off" ? "off" : filter.reso);
			outlet(OUT_STATE, "gain", def.gain === "off" ? "off" : filter.gain);
		}

		return true;
	}

	public setFilterType(type: FilterType, n: number = this.selected) {
		const filter = this.getFilter(n);
		if (!filter) {
			return false;
		}

		if (filter.type === type) {
			return false;
		}

		const def = FILTER_DEFS[type];
		switch (def.reso) {
			case "y":
				filter.reso = filter.y === undefined ? RESO_DEFAULT : y2r(filter.y);

			case "z":
				filter.reso = filter.z === undefined ? RESO_DEFAULT : y2r(filter.z);

			case "off":
				filter.reso = RESO_DEFAULT;
		}

		switch (def.gain) {
			case "y":
				filter.gain = filter.y === undefined ? GAIN_DEFAULT : y2g(filter.y);

			case "off":
				filter.gain = GAIN_DEFAULT;
		}

		filter.type = type;
		filter.y = getY(filter);
		filter.dirty = true;
		this.recalculate();

		if (this.selected === n) {
			outlet(OUT_STATE, "type", filter.type);
			outlet(OUT_STATE, "reso", def.reso === "off" ? "off" : filter.reso);
			outlet(OUT_STATE, "gain", def.gain === "off" ? "off" : filter.gain);
		}

		return true;
	}

	public setFilterFreq(freq: number, n: number = this.selected) {
		const filter = this.getFilter(n);
		if (!filter) {
			return false;
		}

		const clampedFreq = clamp(freq, FREQ_MIN, FREQ_MAX);
		if (filter.freq === clampedFreq) {
			return false;
		}

		filter.freq = clampedFreq;
		filter.x = f2x(clampedFreq);
		filter.dirty = true;
		this.recalculate();

		if (this.selected === n) {
			outlet(OUT_STATE, "freq", filter.freq);
		}

		return true;
	}

	public setFilterReso(reso: number, n: number = this.selected) {
		const filter = this.getFilter(n);
		if (!filter) {
			return false;
		}

		if (FILTER_DEFS[filter.type].reso === "off") {
			return false;
		}

		const clampedReso = clamp(reso, RESO_MIN, RESO_MAX);
		if (filter.reso === clampedReso) {
			return false;
		}

		filter.reso = clampedReso;
		filter.y = getY(filter);
		filter.z = getZ(filter);
		filter.dirty = true;
		this.recalculate();

		if (this.selected === n) {
			outlet(OUT_STATE, "reso", filter.reso);
		}

		return true;
	}

	public setFilterGain(gain: number, n: number = this.selected) {
		const filter = this.getFilter(n);
		if (!filter) {
			return false;
		}

		if (FILTER_DEFS[filter.type].gain === "off") {
			return false;
		}

		const clampedGain = clamp(gain, GAIN_MIN, GAIN_MAX);
		if (filter.gain === clampedGain) {
			return false;
		}

		filter.gain = clampedGain;
		filter.y = getY(filter);
		filter.z = getZ(filter);
		filter.dirty = true;
		this.recalculate();

		if (this.selected === n) {
			outlet(OUT_STATE, "gain", filter.gain);
		}

		return true;
	}

	public moveFilterXY(x: number, y: number) {
		const filter = this.getFilter();
		if (!filter) {
			return;
		}

		this.setFilterFreq(x2f(x));

		const def = FILTER_DEFS[filter.type];
		if (def.reso === "y") {
			this.setFilterReso(y2r(y));
		}
		else if (def.gain === "y") {
			this.setFilterGain(y2g(y));
		}
	}

	public moveFilterZ(dz: number) {
		const filter = this.getFilter();
		if (!filter) {
			return;
		}

		const def = FILTER_DEFS[filter.type];
		if (def.reso === "z") {
			this.setFilterReso(y2r(filter.z + dz));
		}
	}


	private recalculate() {
		const { coefficients, sampleRate } = this;
		const filters = this.getFiltersSorted();
		const { length } = filters;

		let filterIndex = 0;
		let coeffIndex = 0;
		let filter;

		coefficients.length = length * 5;
		for (filterIndex = 0; filterIndex < length; filterIndex += 1) {
			filter = filters[filterIndex];
			if (filter.dirty) {
				FILTER_DEFS[filter.type].calculate(filter, sampleRate);
				filter.dirty = false;
			}

			coefficients[coeffIndex++] = filter.a0;
			coefficients[coeffIndex++] = filter.a1;
			coefficients[coeffIndex++] = filter.a2;
			coefficients[coeffIndex++] = filter.b1;
			coefficients[coeffIndex++] = filter.b2;
		}

		this.outputCoefficients();
	}
}


interface FilterDefinition {
	readonly reso: "off" | "y" | "z";
	readonly gain: "off" | "y" | "z";
	readonly calculate: (filter: Filter, sampleRate: number) => void;
}

const FILTER_DEFS = {

	/** first order low pass */
	lp1: {
		reso: "off",
		gain: "off",
		calculate: (f, sr) => {
			const w = TAU * f.freq / sr;
			const g = Math.cos(w) / (1.0 + Math.sin(w));

			f.a0 = (1.0 - g) * 0.5;
			f.a1 = f.a0;
			f.a2 = 0.0;
			f.b1 = -g;
			f.b2 = 0.0;
		},
	},

	/** second order low pass */
	lp2: {
		reso: "y",
		gain: "off",
		calculate: (f, sr) => {
			const w = TAU * f.freq / sr;
			const d = Math.sin(w) * 0.5 / f.reso;
			const b = 0.5 * (1.0 - d) / (1.0 + d);
			const g = (0.5 + b) * Math.cos(w);

			const a0 = (0.5 + b - g) * 0.5;
			f.a0 = a0;
			f.a1 = a0 * 2.0;
			f.a2 = a0;
			f.b1 = g * -2.0;
			f.b2 = b * 2.0;
		},
	},

	/** first order high pass */
	hp1: {
		reso: "off",
		gain: "off",
		calculate: (f, sr) => {
			const w = TAU * f.freq / sr;
			const g = Math.cos(w) / (1.0 + Math.sin(w));

			f.a0 = (1.0 + g) * 0.5;
			f.a1 = -f.a0;
			f.a2 = 0.0;
			f.b1 = -g;
			f.b2 = 0.0;
		},
	},

	/** second order high pass */
	hp2: {
		reso: "y",
		gain: "off",
		calculate: (f, sr) => {
			const w = TAU * f.freq / sr;
			const d = Math.sin(w) * 0.5 / f.reso;
			const b = 0.5 * (1.0 - d) / (1.0 + d);
			const g = (0.5 + b) * Math.cos(w);

			const a0 = (0.5 + b + g) * 0.5;
			f.a0 = a0;
			f.a1 = a0 * -2.0;
			f.a2 = a0;
			f.b1 = g * -2.0;
			f.b2 = b * 2.0;
		},
	},

	/** first order low shelf */
	ls1: {
		reso: "off",
		gain: "y",
		calculate: (f, sr) => {
			const t = Math.tan(TAU * f.freq / sr);
			const g = Math.pow(10.0, f.gain / 20.0);

			f.a0 = (t * g + 1.0) / (t + 1.0);
			f.a1 = (t * g - 1.0) / (t + 1.0);
			f.a2 = 0.0;
			f.b1 = (t - 1.0) / (t + 1.0);
			f.b2 = 0.0;
		},
	},

	/** second order low shelf */
	ls2: {
		reso: "z",
		gain: "y",
		calculate: (f, sr) => {
			const w = TAU * f.freq / sr;
			const g = Math.pow(10.0, f.gain / 40.0);
			const alpha = Math.sin(w) / (2.0 * f.reso);
			const beta = Math.cos(w);
			const adj = 2.0 * Math.sqrt(g) * alpha;

			const norm = 1.0 / (g + 1.0 + (g - 1.0) * beta + adj);
			f.a0 = g * (g + 1.0 - (g - 1.0) * beta + adj) * norm;
			f.a1 = 2.0 * g * (g - 1.0 - (g + 1.0) * beta) * norm;
			f.a2 = g * (g + 1.0 - (g - 1.0) * beta - adj) * norm;
			f.b1 = -2.0 * (g - 1.0 + (g + 1.0) * beta) * norm;
			f.b2 = (g + 1.0 + (g - 1.0) * beta - adj) * norm;
		},
	},

	/** first order high shelf */
	hs1: {
		reso: "off",
		gain: "y",
		calculate: (f, sr) => {
			const t = Math.tan(TAU * f.freq / sr);
			const g = Math.pow(10.0, f.gain / 20.0);

			f.a0 = (t + g) / (t + 1.0);
			f.a1 = (t - g) / (t + 1.0);
			f.a2 = 0.0;
			f.b1 = (t - 1.0) / (t + 1.0);
			f.b2 = 0.0;
		},
	},

	/** second order high shelf */
	hs2: {
		reso: "z",
		gain: "y",
		calculate: (f, sr) => {
			const w = TAU * f.freq / sr;
			const g = Math.pow(10.0, f.gain / 40.0);
			const alpha = Math.sin(w) / (2.0 * f.reso);
			const beta = Math.cos(w);
			const adj = 2.0 * Math.sqrt(g) * alpha;

			const norm = 1.0 / (g + 1.0 - (g - 1.0) * beta + adj);
			f.a0 = g * (g + 1.0 + (g - 1.0) * beta + adj) * norm;
			f.a1 = -2.0 * g * (g - 1.0 + (g + 1.0) * beta) * norm;
			f.a2 = g * (g + 1.0 + (g - 1.0) * beta - adj) * norm;
			f.b1 = 2.0 * (g - 1.0 - (g + 1.0) * beta) * norm;
			f.b2 = (g + 1.0 - (g - 1.0) * beta - adj) * norm;
		},
	},

	/** second order peak-notch (bell) */
	pn2: {
		reso: "z",
		gain: "y",
		calculate: (f, sr) => {
			const w = TAU * f.freq / sr;
			const g = Math.sqrt(Math.pow(10.0, f.gain / 20.0));
			const alpha = Math.sin(w) / (2.0 * f.reso);
			const beta = Math.cos(w);

			const norm = 1.0 / (1.0 + alpha / g);
			f.a0 = (1.0 + alpha * g) * norm;
			f.a1 = -2.0 * beta * norm;
			f.a2 = (1.0 - alpha * g) * norm;
			f.b1 = -2.0 * beta * norm;
			f.b2 = (1.0 - alpha / g) * norm;
		},
	},

} satisfies Record<string, FilterDefinition>;


function getY(filter: Filter) {
	const def = FILTER_DEFS[filter.type];

	if (def.reso === "y") {
		return r2y(filter.reso);
	}

	if (def.gain === "y") {
		return g2y(filter.gain);
	}

	return g2y(GAIN_DEFAULT);
}

function getZ(filter: Filter) {
	const def = FILTER_DEFS[filter.type];

	if (def.reso === "z") {
		return r2y(filter.reso);
	}

	return r2y(RESO_DEFAULT);
}

function byFreqAsc(a: Filter, b: Filter) {
	return a.freq - b.freq;
}

getY.local = 1;
getZ.local = 1;
byFreqAsc.local = 1;
