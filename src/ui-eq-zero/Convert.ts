import { clamp } from "./common";
import { FREQ_MAX, FREQ_MIN, GAIN_MAX, GAIN_MIN, HANDLE_DIAMETER, HANDLE_RADIUS, RESO_MAX, RESO_MAX_BELL, RESO_MIN } from "./constants";

export const Convert = (() => {
	const freqMinExp = Math.log10(FREQ_MIN);
	const freqMaxExp = Math.log10(FREQ_MAX);

	const resoMinExp = Math.log10(RESO_MIN);
	const resoMaxExp = Math.log10(RESO_MAX);
	const resoMaxBellExp = Math.log10(RESO_MAX_BELL);

	const MAX_Z = 200.0;

	// safe defaults
	let vw = 32.0;
	let vh = 32.0;

	let VISIBLE_FREQ_MIN_EXP = freqMinExp;
	let VISIBLE_FREQ_MAX_EXP = freqMaxExp;

	let VISIBLE_RESO_MIN_EXP = resoMinExp;
	let VISIBLE_RESO_MAX_EXP = resoMaxExp;
	let VISIBLE_RESO_MIN = Math.pow(10.0, VISIBLE_RESO_MIN_EXP);
	let VISIBLE_RESO_MAX = Math.pow(10.0, VISIBLE_RESO_MAX_EXP);

	let VISIBLE_GAIN_MIN = GAIN_MIN;
	let VISIBLE_GAIN_MAX = GAIN_MAX;

	const self = {
		VISIBLE_FREQ_MIN: FREQ_MIN,
		VISIBLE_FREQ_MAX: FREQ_MAX,
		VW: vw,
		VH: vh,
		setViewportSize(width: number, height: number) {
			if (width === vw && height === vh) {
				return;
			}

			vw = Math.max(width, 32.0);
			vh = Math.max(height, 32.0);
			self.VW = vw;
			self.VH = vh;

			const freqScale = (freqMaxExp - freqMinExp) / (vw - HANDLE_DIAMETER);
			VISIBLE_FREQ_MIN_EXP = freqMinExp - HANDLE_RADIUS * freqScale;
			VISIBLE_FREQ_MAX_EXP = freqMaxExp + HANDLE_RADIUS * freqScale;
			self.VISIBLE_FREQ_MIN = Math.pow(10.0, VISIBLE_FREQ_MIN_EXP);
			self.VISIBLE_FREQ_MAX = Math.pow(10.0, VISIBLE_FREQ_MAX_EXP);

			const resoScale = (resoMaxExp - resoMinExp) / (vh - HANDLE_DIAMETER);
			VISIBLE_RESO_MIN_EXP = resoMinExp - HANDLE_RADIUS * resoScale;
			VISIBLE_RESO_MAX_EXP = resoMaxExp + HANDLE_RADIUS * resoScale;
			VISIBLE_RESO_MIN = Math.pow(10.0, VISIBLE_RESO_MIN_EXP);
			VISIBLE_RESO_MAX = Math.pow(10.0, VISIBLE_RESO_MAX_EXP);

			const gainScale = (GAIN_MAX - GAIN_MIN) / (vh - HANDLE_DIAMETER);
			VISIBLE_GAIN_MIN = GAIN_MIN - HANDLE_RADIUS * gainScale;
			VISIBLE_GAIN_MAX = GAIN_MAX + HANDLE_RADIUS * gainScale;
		},
		x2f(x: number) {
			return Math.pow(10.0, VISIBLE_FREQ_MIN_EXP + clamp(x / vw) * (VISIBLE_FREQ_MAX_EXP - VISIBLE_FREQ_MIN_EXP));
		},
		f2x(f: number) {
			return vw * (Math.log10(f) - VISIBLE_FREQ_MIN_EXP) / (VISIBLE_FREQ_MAX_EXP - VISIBLE_FREQ_MIN_EXP);
		},
		y2g(y: number) {
			return VISIBLE_GAIN_MIN + clamp(1.0 - y / vh) * (VISIBLE_GAIN_MAX - VISIBLE_GAIN_MIN);
		},
		g2y(g: number) {
			return vh * (1.0 - (g - VISIBLE_GAIN_MIN) / (VISIBLE_GAIN_MAX - VISIBLE_GAIN_MIN));
		},
		y2r(y: number) {
			return Math.pow(10.0, VISIBLE_RESO_MIN_EXP + clamp(1.0 - y / vh) * (VISIBLE_RESO_MAX_EXP - VISIBLE_RESO_MIN_EXP));
		},
		r2y(r: number) {
			return vh * (1.0 - (Math.log10(r) - VISIBLE_RESO_MIN_EXP) / (VISIBLE_RESO_MAX_EXP - VISIBLE_RESO_MIN_EXP));
		},
		z2r(z: number, isBell: boolean = false) {
			const max = isBell ? resoMaxBellExp : resoMaxExp;
			return Math.pow(10.0, resoMinExp + clamp(z / MAX_Z) * (max - resoMinExp));
		},
		r2z(r: number, isBell: boolean = false) {
			const max = isBell ? resoMaxBellExp : resoMaxExp;
			return MAX_Z * (Math.log10(r) - resoMinExp) / (max - resoMinExp);
		},
	};

	return self;
})();
