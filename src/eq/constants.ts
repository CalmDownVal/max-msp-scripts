// base constants - change as needed

export const MAX_FILTERS = 8;

export const HANDLE_RADIUS = 5.0;

export const FREQ_MIN =    30.0;
export const FREQ_MAX = 20000.0;

export const RESO_MIN =  0.1;
export const RESO_MAX = 18.0;
export const RESO_DEFAULT = 0.71;

export const GAIN_MIN = -24.0;
export const GAIN_MAX =  24.0;
export const GAIN_DEFAULT = 0.0;

export const GRID_X = [
	           30.0,   40.0,   50.0,   60.0,   70.0,   80.0,   90.0,
	  200.0,  300.0,  400.0,  500.0,  600.0,  700.0,  800.0,  900.0,
	 2000.0, 3000.0, 4000.0, 5000.0, 6000.0, 7000.0, 8000.0, 9000.0,
	20000.0,
];

export const GRID_X_HIGHLIGHT = [
	  100.0,
	 1000.0,
	10000.0,
];

export const GRID_Y = [
	-18.0,
	-12.0,
	- 6.0,
	  6.0,
	 12.0,
	 18.0,
];

export const GRID_Y_HIGHLIGHT = [
	0.0,
];


// max constants

export const OUT_COEFFS = 0;
export const OUT_STATE = 1;
export const OUT_PARAM = 2;


// derived constants

export const TAU = 2.0 * Math.PI;

export const VW = box.rect[2] - box.rect[0];
export const VH = box.rect[3] - box.rect[1];
export const HANDLE_DIAMETER = 2.0 * HANDLE_RADIUS;


const freqMinExp = Math.log10(FREQ_MIN);
const freqMaxExp = Math.log10(FREQ_MAX);
const freqScale = (freqMaxExp - freqMinExp) / (VW - HANDLE_DIAMETER);

export const VISIBLE_FREQ_MIN_EXP = freqMinExp - HANDLE_RADIUS * freqScale;
export const VISIBLE_FREQ_MAX_EXP = freqMaxExp + HANDLE_RADIUS * freqScale;
export const VISIBLE_FREQ_MIN = Math.pow(10.0, VISIBLE_FREQ_MIN_EXP);
export const VISIBLE_FREQ_MAX = Math.pow(10.0, VISIBLE_FREQ_MAX_EXP);


const resoMinExp = Math.log10(RESO_MIN);
const resoMaxExp = Math.log10(RESO_MAX);
const resoScale = (resoMaxExp - resoMinExp) / (VH - HANDLE_DIAMETER);

export const VISIBLE_RESO_MIN_EXP = resoMinExp - HANDLE_RADIUS * resoScale;
export const VISIBLE_RESO_MAX_EXP = resoMaxExp + HANDLE_RADIUS * resoScale;
export const VISIBLE_RESO_MIN = Math.pow(10.0, VISIBLE_RESO_MIN_EXP);
export const VISIBLE_RESO_MAX = Math.pow(10.0, VISIBLE_RESO_MAX_EXP);


const gainScale = (GAIN_MAX - GAIN_MIN) / (VH - HANDLE_DIAMETER);

export const VISIBLE_GAIN_MIN = GAIN_MIN - HANDLE_RADIUS * gainScale;
export const VISIBLE_GAIN_MAX = GAIN_MAX + HANDLE_RADIUS * gainScale;
