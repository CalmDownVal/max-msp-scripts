// a harmonic series editor
//
// arguments:
// - [bins]						... initial number of bins (optional, defaults to 16)
//
// inlets:
// - 1							... commands
// - 2							... param recall input (TODO)
//
// outlets:
// - 1							... bang whenever wave coeffs change due to user edits
// - 2							... param store output (TODO)
//
// commands:
// - `active <1|0>`				... report the active status of the parent device
// - `bins <n>`					... sets the number of bins
// - `buffer <name>`			... sets the name of the Max Buffer to write wave coeffs to
// - `preset <name>`			... applies a preset by name (sin, tri, sqr, saw)
// - `set <n> <amp> <phase>`	... sets the amplitude and phase of the n-th bin

import { clamp, TAU } from "./common";
import { HarmonicSeries } from "./HarmonicSeries";

const INLET_COMMAND = 0;
const INLET_RECALL = 1;

const OUTLET_UPDATE = 0;
const OUTLET_RECALL = 1;

inlets = 2;
outlets = 2;

mgraphics.init();
mgraphics.autofill = 0;
mgraphics.relative_coords = 0;

const series = new HarmonicSeries((() => {
	const n = Number(jsarguments[1]);
	return Number.isInteger(n) && n > 0 ? n : 16;
})());

let isActive = true;
let currentBuffer: Buffer | null = null;
let dragState: "idle" | "ignore" | "active" = "idle";
let dragParam!: "amplitude" | "phase";

function paint() {
	const { a0, a1, p0, p1, bw, qh, vw, vh } = getMeasurements();
	const count = series.getCount();

	// background
	setColor("live_lcd_bg");
	mgraphics.rectangle(0, 0, vw, vh);
	mgraphics.fill();

	// bins
	let x;
	let x0;
	let x1;
	let y;
	let n;

	setColor(isActive ? "live_lcd_control_fg" : "live_lcd_control_fg_zombie");
	for (n = 0, x = 1.0; n < count; n += 1) {
		x0 = Math.round(x);
		x1 = Math.round(x + bw) - 1;
		y = a0 + (a1 - a0) * series.getAmplitude(n) - 1;
		mgraphics.rectangle(x0, y, x1 - x0, a0 - y);
		mgraphics.fill();
		x += bw;
	}

	setColor(isActive ? "live_lcd_control_fg_alt" : "live_lcd_control_fg_zombie");
	for (n = 0, x = 1.0; n < count; n += 1) {
		x0 = Math.round(x);
		x1 = Math.round(x + bw) - 1;
		y = p0 + (p1 - p0) * (0.5 + series.getPhase(n) / TAU) - 1;
		mgraphics.rectangle(x0, y, x1 - x0, p0 - y);
		mgraphics.fill();
		x += bw;
	}

	// wave
	const steps = Math.ceil((vw - 4.0) * 0.25);
	const dx = (vw - 4.0) / steps;
	const dp = TAU / steps - Number.EPSILON;
	const wa = qh - 5;

	let p;

	x = 2.0;
	mgraphics.set_line_width(2.0);
	mgraphics.set_line_join("round");
	mgraphics.set_line_cap("round");
	mgraphics.move_to(x, qh + series.getAmplitudeAt(0.0) * wa);

	for (p = dp, x += dx; p < TAU; p += dp, x += dx) {
		mgraphics.line_to(x, qh + series.getAmplitudeAt(p) * wa);
	}

	mgraphics.stroke();
}

function onpointerdown(e: PointerEvent) {
	if (dragState !== "idle") {
		return;
	}

	const { a0, a1, p0, p1 } = getMeasurements();
	if (e.clientY >= a1 && e.clientY <= a0) {
		dragState = "active";
		dragParam = "amplitude";
		onpointermove(e);
	}
	else if (e.clientY >= p1 && e.clientY <= p0) {
		dragState = "active";
		dragParam = "phase";
		onpointermove(e);
	}
	else {
		dragState = "ignore";
	}
}

function onpointermove(e: PointerEvent) {
	if (dragState !== "active") {
		return;
	}

	const { a0, a1, p0, p1, bw } = getMeasurements();
	const n = Math.floor((e.clientX - 1) / bw);
	if (n < 0 || n >= series.getCount()) {
		return;
	}

	let didChange;
	switch (dragParam) {
		case "amplitude": {
			const a = 1.0 - (e.clientY - a1) / (a0 - a1);
			didChange = series.setAmplitude(n, a);
			break;
		}

		case "phase": {
			const p = clamp(1.0 - (e.clientY - p1) / (p0 - p1));
			didChange = series.setPhase(n, (p - 0.5) * TAU);
			break;
		}
	}

	if (didChange) {
		refresh();
		outlet(OUTLET_UPDATE, "bang");
	}
}

function onpointerup() {
	dragState = "idle";
}


function active(toggle: number) {
	if (inlet !== INLET_COMMAND || typeof toggle !== "number") {
		return;
	}

	const state = toggle > 0;
	if (isActive !== state) {
		isActive = state;
		mgraphics.redraw();
	}
}

function bang() {
	if (inlet !== INLET_COMMAND) {
		return;
	}

	refresh();
}

function bins(n: number) {
	if (inlet !== INLET_COMMAND || !Number.isInteger(n)) {
		return;
	}

	series.setBinCount(n) && refresh();
}

function buffer(name: string) {
	if (inlet !== INLET_COMMAND || typeof name !== "string") {
		return;
	}

	currentBuffer?.freepeer();
	currentBuffer = new Buffer(name);
	series.toBuffer(currentBuffer);
}

function preset(name: string) {
	if (inlet !== INLET_COMMAND) {
		return;
	}

	switch (name) {
		case "sin":
			series.makeSine();
			break;

		case "tri":
			series.makeTriangle();
			break;

		case "sqr":
			series.makeSquare();
			break;

		case "saw":
			series.makeSawtooth();
			break;

		default:
			return;
	}

	refresh();
}

function set(n: number, amplitude: number, phase: number) {
	if (!(
		inlet === INLET_COMMAND &&
		Number.isInteger(n) &&
		Number.isFinite(amplitude) &&
		Number.isFinite(phase)
	)) {
		return;
	}

	const a = series.setAmplitude(n, amplitude);
	const p = series.setPhase(n, phase);
	if (a || p) {
		refresh();
	}
}

function dictionary(name: string) {
	if (inlet !== INLET_RECALL || typeof name !== "string") {
		return;
	}

	series.setBackingDict(name) && refresh();
}


getMeasurements.local = 1;
function getMeasurements() {
	const vw = mgraphics.size[0];
	const vh = mgraphics.size[1];
	const qh = vh / 4.0;
	return {
		qh,
		bw: (vw - 1) / series.getCount(),
		p0: vh - 1,
		p1: vh - qh + 1,
		a0: vh - qh - 1,
		a1: vh - qh - qh + 1,
		vw,
		vh,
	};
}

setColor.local = 1;
function setColor(color: string) {
	const rgba = max.getcolor(color);
	mgraphics.set_source_rgba(rgba);
}

refresh.local = 1;
function refresh() {
	if (currentBuffer) {
		series.toBuffer(currentBuffer);
	}

	outlet(OUTLET_RECALL, "dictionary", series.getBackingDict());
	mgraphics.redraw();
}
