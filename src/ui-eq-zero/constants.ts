export const MAX_FILTERS = 8;

export const HANDLE_RADIUS = 5.0;
export const HANDLE_DIAMETER = 2.0 * HANDLE_RADIUS;

export const FREQ_MIN =    30.0;
export const FREQ_MAX = 20000.0;

export const RESO_MIN      =  0.10;
export const RESO_MAX      =  0.71;
export const RESO_MAX_BELL = 18.00;
export const RESO_DEFAULT  =  0.71;

export const GAIN_MIN     = -24.0;
export const GAIN_MAX     =   0.0;
export const GAIN_DEFAULT =   0.0;

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


// I/O

export const INLET_COMMAND = 0;
export const INLET_RECALL = 1;

export const OUTLET_CASCADE = 0;
export const OUTLET_STATE = 1;
export const OUTLET_RECALL = 2;
