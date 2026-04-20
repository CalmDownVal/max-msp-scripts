// an EQ curve editor
//
// inlets:
// - 1										... commands
// - 2										... param recall input (TODO)
//
// outlets:
// - 1										... cascade coefficients
// - 2										... selected filter state (select, type, freq, gain, reso)
// - 3										... param store output (TODO)
//
// commands:
// - `bang`									... (re-)outputs current coefficients
// - `sr <freq>`							... sets the sample rate (defaults to 44.1 kHz)
// - `active <1|0>`							... report the active status of the parent device
// - `add <type> <freq> [reso] [gain]`		... adds a filter, it will be automatically selected
// - `remove [n]`							... removes the current filter or a filter by its number
// - `select <n>`							... selects a filter by its number
// - `type <type> [n]`						... sets the type of the current filter or a filter by its number
// - `freq <freq> [n]`						... sets the frequency in Hz of the current filter or a filter by its number
// - `reso <reso> [n]`						... sets the resonance of the current filter or a filter by its number (ignored for 1st-order filters)
// - `gain <gain> [n]`						... sets the gain in dB of the current filter or a filter by its number (ignored for lp1, lp2, hp1, hp2)
//
// filter types:
// - lp1									... 1st-order low pass (freq)
// - lp2									... 2nd-order low pass (freq, reso)
// - hp1									... 1st-order high pass (freq)
// - hp2									... 2nd-order high pass (freq, reso)
// - ls1									... 1st-order low shelf (freq, gain)
// - ls2									... 2nd-order low shelf (freq, reso, gain)
// - hs1									... 1st-order high shelf (freq, gain)
// - hs2									... 2nd-order high shelf (freq, reso, gain)
// - pn2									... 2nd-order peak-notch (freq, reso, gain)

import { f2x, g2y, x2f, y2g, y2r } from "./common";
import { FREQ_MAX, FREQ_MIN, GRID_X, GRID_X_HIGHLIGHT, GRID_Y, GRID_Y_HIGHLIGHT, HANDLE_RADIUS, HANDLE_DIAMETER, VW, VH, GAIN_DEFAULT, RESO_DEFAULT } from "./constants";
import { FilterCascade } from "./FilterCascade";

inlets = 2;
outlets = 3;

mgraphics.init();
mgraphics.autofill = 0;
mgraphics.relative_coords = 0;


const cascade = new FilterCascade();

let isActive = true;
let dragState: "idle" | "active" | "ignore" = "idle";
let dragDX = 0.0;
let dragDY = 0.0;

interface Point {
	x: number;
	y: number;
	next?: Point;
	prev?: Point;
}

function paint() {
	// build linked list of plot points
	const head: Point = {
		x: 0.0,
		y: g2y(cascade.calculateGainAt(FREQ_MIN)),
	};

	const tail: Point = {
		x: VW,
		y: g2y(cascade.calculateGainAt(FREQ_MAX)),
	};

	const filters = cascade.getFiltersSorted();
	const count = filters.length;

	let index;
	let filter;
	let prev = head;
	let node;

	for (index = 0; index < count; index += 1) {
		filter = filters[index];
		node = {
			x: f2x(filter.freq),
			y: g2y(cascade.calculateGainAt(filter.freq)),
			prev,
		};

		prev.next = node;
		subdivide(prev, node);
		prev = node;
	}

	tail.prev = prev;
	prev.next = tail;
	subdivide(prev, tail);


	// background
	setColor("live_lcd_bg");
	mgraphics.rectangle(0, 0, VW, VH);
	mgraphics.fill();


	// grid lines
	let x;
	let y;

	setColor("live_lcd_frame");
	mgraphics.set_line_width(1.0);

	for (index = 0; index < GRID_X.length; index += 1) {
		x = f2x(GRID_X[index]);
		mgraphics.move_to(x, 0.0);
		mgraphics.line_to(x, VH);
	}

	for (index = 0; index < GRID_Y.length; index += 1) {
		y = g2y(GRID_Y[index]);
		mgraphics.move_to(0.0, y);
		mgraphics.line_to(VW, y);
	}

	mgraphics.stroke();
	setColor("live_lcd_control_fg_zombie");

	for (index = 0; index < GRID_X_HIGHLIGHT.length; index += 1) {
		x = f2x(GRID_X_HIGHLIGHT[index]);
		mgraphics.move_to(x, 0.0);
		mgraphics.line_to(x, VH);
	}

	for (index = 0; index < GRID_Y_HIGHLIGHT.length; index += 1) {
		y = g2y(GRID_Y_HIGHLIGHT[index]);
		mgraphics.move_to(0.0, y);
		mgraphics.line_to(VW, y);
	}

	mgraphics.stroke();

	// gain curve
	setColor(isActive ? "live_lcd_control_fg_alt" : "live_lcd_control_fg_zombie");
	mgraphics.set_line_width(2.0);
	mgraphics.set_line_cap("round");
	mgraphics.set_line_join("round");
	mgraphics.move_to(head.x, head.y);
	node = head.next;
	while (node) {
		mgraphics.line_to(node.x, node.y);
		node = node.next;
	}

	mgraphics.stroke();


	// filter handles
	setColor("live_lcd_control_fg_zombie");
	const selected = cascade.getFilter();
	for (index = 0; index < count; index += 1) {
		filter = filters[index];
		if (filter !== selected) {
			mgraphics.ellipse(filter.x - HANDLE_RADIUS, filter.y - HANDLE_RADIUS, HANDLE_DIAMETER, HANDLE_DIAMETER);
			mgraphics.fill();
		}
	}

	if (selected) {
		if (isActive) {
			setColor("live_lcd_control_fg");
		}

		mgraphics.ellipse(selected.x - HANDLE_RADIUS, selected.y - HANDLE_RADIUS, HANDLE_DIAMETER, HANDLE_DIAMETER);
		mgraphics.fill();
	}
}


function active(toggle: number) {
	const state = typeof toggle === "number" && toggle > 0;
	if (isActive !== state) {
		isActive = state;
		mgraphics.redraw();
	}
}

function bang() {
	cascade.outputCoefficients();
	mgraphics.redraw();
}

function sr(rate: number) {
	if (!Number.isFinite(rate) || rate <= 10.0) {
		return;
	}

	cascade.setSampleRate(rate) && mgraphics.redraw();
}

function add(type: string, freq: number, reso: number = RESO_DEFAULT, gain: number = GAIN_DEFAULT) {
	if (!(
		typeof type === "string" &&
		cascade.isKnownType(type) &&
		Number.isFinite(freq) &&
		Number.isFinite(reso) &&
		Number.isFinite(gain)
	)) {
		return;
	}

	cascade.addFilter(type, freq, reso, gain) && mgraphics.redraw();
}

function remove(n?: number) {
	if (n !== undefined && !Number.isInteger(n)) {
		return;
	}

	if (cascade.removeFilter(n)) {
		dragState = "idle"; // prevent jump if dragging
		mgraphics.redraw();
	}
}

function select(n: number) {
	if (!Number.isInteger(n)) {
		return;
	}

	cascade.selectFilter(n) && mgraphics.redraw();
}

function type(type: string, n?: number) {
	if (!(
		typeof type === "string" &&
		cascade.isKnownType(type) &&
		(n === undefined || Number.isInteger(n))
	)) {
		return;
	}

	cascade.setFilterType(type, n) && mgraphics.redraw();
}

function freq(freq: number, n?: number) {
	if (!Number.isFinite(freq) || (n !== undefined && !Number.isInteger(n))) {
		return;
	}

	cascade.setFilterFreq(freq, n) && mgraphics.redraw();
}

function reso(reso: number, n?: number) {
	if (!Number.isFinite(reso) || (n !== undefined && !Number.isInteger(n))) {
		return;
	}

	cascade.setFilterReso(reso, n) && mgraphics.redraw();
}

function gain(gain: number, n?: number) {
	if (!Number.isFinite(gain) || (n !== undefined && !Number.isInteger(n))) {
		return;
	}

	cascade.setFilterGain(gain, n) && mgraphics.redraw();
}


function ondblclick(x: number, y: number) {
	const hit = hitTest(x, y, 1.0);
	if (hit) {
		cascade.removeFilter(hit.num);
	}
	else {
		const rx = x / VW;
		if (rx < 0.1) {
			cascade.addFilter("hp2", x2f(x), y2r(y), undefined);
		}
		else if (rx < 0.25) {
			cascade.addFilter("ls2", x2f(x), undefined, y2g(y));
		}
		else if (rx > 0.9) {
			cascade.addFilter("lp2", x2f(x), y2r(y), undefined);
		}
		else if (rx > 0.75) {
			cascade.addFilter("hs2", x2f(x), undefined, y2g(y));
		}
		else {
			cascade.addFilter("pn2", x2f(x), undefined, y2g(y));
		}
	}

	mgraphics.redraw();
}

function onpointerdown(e: PointerEvent) {
	if (dragState !== "idle") {
		return;
	}

	const hit = hitTest(e.clientX, e.clientY, 3.0);
	if (hit) {
		dragState = "active";
		dragDX = hit.dx;
		dragDY = hit.dy;
		cascade.selectFilter(hit.num) && mgraphics.redraw();
	}
	else {
		dragState = "ignore";
	}
}

function onpointermove(e: PointerEvent) {
	if (dragState !== "active") {
		return;
	}

	cascade.moveFilterXY(e.clientX + dragDX, e.clientY + dragDY);
	mgraphics.redraw();
}

function onpointerup(e: PointerEvent) {
	dragState = "idle";
}

function onwheel(x: number, y: number, _dx: number, dy: number) {
	let num;
	if (dragState !== "active") {
		const hit = hitTest(x, y, 3.0);
		if (!hit) {
			return;
		}

		num = hit.num;
	}

	cascade.moveFilterZ(Math.sign(dy) * 1.0, num);
	mgraphics.redraw();
}


subdivide.local = 1;
function subdivide(a: Point, b: Point) {
	const adx = Math.abs(b.x - a.x);
	if (adx < 1.0) {
		// skip - less than 1pt between points
		return;
	}

	// create a midpoint - don't insert yet
	const x = (a.x + b.x) * 0.5;
	const y = g2y(cascade.calculateGainAt(x2f(x)));
	const node = {
		x,
		y,
		prev: a,
		next: b,
	};

	// when within some horizontal distance, compare to a naive lerp
	if (adx < 10.0) {
		const ly = (a.y + b.y) * 0.5;
		if (Math.abs(y - ly) < 0.5) {
			// skip this subdivision - lerp is good enough
			return;
		}
	}

	a.next = node;
	b.prev = node;

	subdivide(a, node);
	subdivide(node, b);
}

setColor.local = 1;
function setColor(color: string) {
	const rgba = max.getcolor(color);
	mgraphics.set_source_rgba(rgba);
}

hitTest.local = 1;
function hitTest(x: number, y: number, extent: number = 1.0) {
	const filters = cascade.getFiltersOrdered();
	const { length } = filters;

	let index = 0;
	let filter;
	let dx;
	let dy;
	let ds;
	let min = HANDLE_RADIUS * extent;
	let result = null;

	min *= min;
	for (; index < length; index += 1) {
		filter = filters[index];
		dx = filter.x - x;
		dy = filter.y - y;
		ds = dx * dx + dy * dy;
		if (ds < min) {
			min = ds;
			result = {
				dx,
				dy,
				num: index + 1,
			};
		}
	}

	return result;
}
