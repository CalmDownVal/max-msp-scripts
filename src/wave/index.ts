// Minimalistic wave editor (composed from )
//
// inlets:
// - 1							... commands
// - 2							... param recall input (TODO)
//
// outlets:
// - 1							... bin amplitudes list
// - 2							... bin phases list
// - 3							... param store output (TODO)
//
// commands:
// - `bang`						... (re-)outputs current coefficients (list of amp-phase pairs)
// - `set <n> <amp> <phase>`	... sets the amplitude and phase of the n-th bin
// - `preset <name>`			... applies a preset by name (sin, tri, squ, saw)

import { BINS, TAU, VH, VW } from "./constants";

inlets = 2;
outlets = 3;

mgraphics.init();
mgraphics.autofill = 0;
mgraphics.relative_coords = 0;


interface Bin {
	amplitude: number;
	phase: number;
}

const BW = VW / BINS;
const QH = VH / 4.0;

const p0 = VH - 1;
const p1 = VH - QH + 1;
const a0 = VH - QH - 1;
const a1 = VH - QH - QH + 1;

const state: readonly Bin[] = (() => {
	const tmp: Bin[] = [];
	let i = 0;
	for (; i < BINS; i += 1) {
		tmp.push({
			amplitude: 0.0,
			phase: 0.5,
		});
	}

	tmp[0].amplitude = 1.0;
	return tmp;
})();

function paint() {
	// background
	setColor("live_lcd_bg");
	mgraphics.rectangle(0, 0, VW, VH);
	mgraphics.fill();

	// bins
	let x;
	let y;
	let i;

	setColor("live_lcd_control_fg");
	for (i = 0, x = 0; i < BINS; i += 1) {
		y = a0 + (a1 - a0) * state[i].amplitude - 1;
		mgraphics.rectangle(x, y, BW - 1, a0 - y);
		mgraphics.fill();
		x = Math.round(x + BW);
	}

	setColor("live_lcd_control_fg_alt");
	for (i = 0, x = 0; i < BINS; i += 1) {
		y = p0 + (p1 - p0) * state[i].phase - 1;
		mgraphics.rectangle(x, y, BW - 1, p0 - y);
		mgraphics.fill();
		x = Math.round(x + BW);
	}

	// wave
	const dx = 3;
	const dq = TAU / Math.floor(VW / dx);
	const wa = QH - 5;

	let q;

	mgraphics.set_line_width(2.0);
	mgraphics.set_line_join("round");
	mgraphics.set_line_cap("round");
	mgraphics.move_to(0, QH + getAmplitudeAt(0.0) * wa);

	for (q = dq, x = dx; x <= VW; q += dq, x += dx) {
		mgraphics.line_to(x, QH + getAmplitudeAt(q) * wa);
	}

	mgraphics.stroke();
}


function bang() {
	outlet(0, state.map(bin => bin.amplitude));
	outlet(1, state.map(bin => (bin.phase - 0.5) * TAU));
	mgraphics.redraw();
}

function set(n: number, amplitude: number, phase: number) {
	if (!(
		Number.isInteger(n) &&
		n >= 0 &&
		n < BINS &&
		Number.isFinite(amplitude) &&
		Number.isFinite(phase)
	)) {
		return;
	}

	state[n].amplitude = clamp(amplitude);
	state[n].phase = (1.0 + (phase / TAU) % 1.0) % 1.0;
	bang();
}

function preset(name: string) {
	switch (name) {
		case "sin": {
			let bin = state[0];
			bin.amplitude = 1.0;
			bin.phase = 0.5;

			let n = 1;
			do {
				bin = state[n++];
				bin.amplitude = 0.0;
				bin.phase = 0.5;
			}
			while (n < BINS);

			break;
		}

		case "tri": {
			let bin;
			let n = 0;
			do {
				bin = state[n++];
				bin.amplitude = (n % 2) === 1 ? 1.0 / (n * n) : 0.0;
				bin.phase = (n % 4) === 1 ? 0.5 : 0.0;
			}
			while (n < BINS);

			break;
		}

		case "squ": {
			let bin;
			let n = 0;
			do {
				bin = state[n++];
				bin.amplitude = (n % 2) === 1 ? 1.0 / n : 0.0;
				bin.phase = 0.5;
			}
			while (n < BINS);

			break;
		}

		case "saw": {
			let bin;
			let n = 0;
			do {
				bin = state[n++];
				bin.amplitude = 1.0 / n;
				bin.phase = 0.5;
			}
			while (n < BINS);

			break;
		}

		default:
			return;
	}

	bang();
}


let dragState: "idle" | "ignore" | "active" = "idle";
let dragParam!: "amplitude" | "phase";

function ondrag(x: number, y: number, isPressed: 1 | 0) {
	if (dragState === "idle" && isPressed) {
		if (y >= a1 && y <= a0) {
			dragState = "active";
			dragParam = "amplitude";
		}
		else if (y >= p1 && y <= p0) {
			dragState = "active";
			dragParam = "phase";
		}
		else {
			dragState = "ignore";
		}
	}

	if (!isPressed) {
		dragState = "idle";
	}
	else if (dragState === "active") {
		const index = Math.floor(x / BW);
		if (index < 0 || index >= BINS) {
			return;
		}

		switch (dragParam) {
			case "amplitude":
				state[index].amplitude = clamp(1.0 - (y - a1) / (a0 - a1));
				break;

			case "phase":
				state[index].phase = clamp(1.0 - (y - p1) / (p0 - p1));
				break;
		}

		bang();
	}
}


getAmplitudeAt.local = 1;
function getAmplitudeAt(phase: number) {
	let bin;
	let amp = 0.0;
	let sum = 0.0;
	let i = 0;

	do {
		bin = state[i++];
		amp -= Math.sin(phase * i + (bin.phase - 0.5) * TAU) * bin.amplitude;
		sum += bin.amplitude;
	}
	while (i < BINS);

	return amp / Math.max(sum, 0.1);
}

setColor.local = 1;
function setColor(color: string) {
	const rgba = max.getcolor(color);
	mgraphics.set_source_rgba(rgba[0], rgba[1], rgba[2], rgba[3]);
}

clamp.local = 1;
function clamp(value: number, min = 0.0, max = 1.0) {
	return value < min ? min : value > max ? max : value;
}
