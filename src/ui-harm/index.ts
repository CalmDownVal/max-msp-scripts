// a harmonic series editor
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

import { clamp } from "./common";
import { TAU, VH, VW } from "./constants";
import { HarmonicSeries } from "./HarmonicSeries";

inlets = 2;
outlets = 2;

mgraphics.init();
mgraphics.autofill = 0;
mgraphics.relative_coords = 0;

const series = new HarmonicSeries();

let isActive = true;
let currentBuffer: Buffer | null = null;
let dragState: "idle" | "ignore" | "active" = "idle";
let dragParam!: "amplitude" | "phase";

function paint() {
	const { a0, a1, p0, p1, bw, qh } = getMeasurements();
	const count = series.getCount();

	// background
	setColor("live_lcd_bg");
	mgraphics.rectangle(0, 0, VW, VH);
	mgraphics.fill();

	// bins
	let x;
	let y;
	let n;

	setColor(isActive ? "live_lcd_control_fg" : "live_lcd_control_fg_zombie");
	for (n = 0, x = 0; n < count; n += 1) {
		y = a0 + (a1 - a0) * series.getAmplitude(n) - 1;
		mgraphics.rectangle(x, y, bw - 1, a0 - y);
		mgraphics.fill();
		x = Math.round(x + bw);
	}

	setColor(isActive ? "live_lcd_control_fg_alt" : "live_lcd_control_fg_zombie");
	for (n = 0, x = 0; n < count; n += 1) {
		y = p0 + (p1 - p0) * (0.5 + series.getPhase(n) / TAU) - 1;
		mgraphics.rectangle(x, y, bw - 1, p0 - y);
		mgraphics.fill();
		x = Math.round(x + bw);
	}

	// wave
	const dx = 4;
	const dp = TAU / Math.floor((VW - 2.0 * dx) / dx) - Number.EPSILON;
	const wa = qh - 5;

	let p;

	mgraphics.set_line_width(2.0);
	mgraphics.set_line_join("round");
	mgraphics.set_line_cap("round");
	mgraphics.move_to(dx, qh + series.getAmplitudeAt(0.0) * wa);

	for (p = dp, x = 2.0 * dx; p <= TAU; p += dp, x += dx) {
		mgraphics.line_to(x, qh + series.getAmplitudeAt(p) * wa);
	}

	mgraphics.stroke();
}


function active(toggle: number) {
	const state = typeof toggle === "number" && toggle > 0;
	if (isActive !== state) {
		isActive = state;
		mgraphics.redraw();
	}
}

function bang() {
	if (currentBuffer) {
		currentBuffer.poke(1, 0, series.getAmplitudes());
		currentBuffer.poke(2, 0, series.getPhases());
	}

	mgraphics.redraw();
}

function bins(n: number) {
	if (!Number.isInteger(n)) {
		return;
	}

	series.setBinCount(n) && bang();
}

function buffer(name: string) {
	if (typeof name !== "string") {
		return;
	}

	currentBuffer?.freepeer();
	currentBuffer = new Buffer(name);
	bang();
}

function preset(name: string) {
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

	bang();
}

function set(n: number, amplitude: number, phase: number) {
	if (!(
		Number.isInteger(n) &&
		Number.isFinite(amplitude) &&
		Number.isFinite(phase)
	)) {
		return;
	}

	series.setAmplitude(n, amplitude);
	series.setPhase(n, phase);
	bang();
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
	const n = Math.floor(e.clientX / bw);
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
		bang();
		outlet(0, "bang");
	}
}

function onpointerup() {
	dragState = "idle";
}


getMeasurements.local = 1;
function getMeasurements() {
	const qh = VH / 4.0;
	return {
		qh,
		bw: VW / series.getCount(),
		p0: VH - 1,
		p1: VH - qh + 1,
		a0: VH - qh - 1,
		a1: VH - qh - qh + 1,
	};
}

setColor.local = 1;
function setColor(color: string) {
	const rgba = max.getcolor(color);
	mgraphics.set_source_rgba(rgba);
}
