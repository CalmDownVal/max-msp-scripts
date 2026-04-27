// a tabbed channel ui
//
// arguments:
// - [n]						... sets the number of channels (optional, defaults to 8)
//
// inlets:
// - 1							... commands
// - 2							... param recall input (dictionary)
//
// outlets:
// - 1							... poly commands
// - 2							... sync commands
// - 3							... param recall output (dictionary)
//
// inlet 1 commands:
// - `active <1|0>`				... sets the active status of the device
// - `target <n>`				... sets the active channel/tab number
// - `init <param> <value>`		... sets the initial value for a voice parameter
// - `set <param> <value>`		... sets an arbitrary param value for the current channel
// - `copy <n | "all">`			... copy params of currently selected voice to voice n or all voices
// - `mute <n> <1|0>`			... mutest or un-mutes a voice
// - `solo <n>`					... solos a voice or or un-solos when n=0

import { Voices, type VoiceParam } from "./Voices";

const CORNER_RADIUS = 4.0;
const FONT_SIZE = 9.5;
const PADDING = 4.0;
const MUTE_SIZE = 10.0;
const MUTE_OFFSET = MUTE_SIZE + FONT_SIZE + PADDING * 1.5;

const INLET_COMMAND = 0;
const INLET_RECALL = 1;

const OUTLET_POLY = 0;
const OUTLET_SYNC = 1;
const OUTLET_RECALL = 2;

inlets = 2;
outlets = 3;

mgraphics.init();
mgraphics.autofill = 0;
mgraphics.relative_coords = 0;

const voices = new Voices((() => {
	const n = Number(jsarguments[1]);
	return Number.isInteger(n) && n > 0 ? n : 8;
})());

let isActive = true;
let isSoloed = false;
let polyTarget = 0;

function paint() {
	const { tw, vh } = getMeasurements();
	const count = voices.getVoiceCount();
	const selected = voices.getSelectedVoice();

	const colorBgActive = max.getcolor("live_surface_bg");
	const colorText = max.getcolor("live_control_fg");
	const colorMuteBorder = max.getcolor("live_contrast_frame");
	const colorMuteOn = max.getcolor("live_control_selection");
	const colorMuteOff = max.getcolor("live_control_bg");

	let n = 1;
	let x = 0.0;
	let x0;
	let x1;
	let text;
	let size;

	mgraphics.select_font_face("Ableton Sans Medium");
	mgraphics.set_font_size(FONT_SIZE);

	for (; n <= count; n += 1, x += tw) {
		x0 = Math.round(x);
		x1 = Math.round(x + tw) - 1.0;
		if (n === selected) {
			mgraphics.set_source_rgba(colorBgActive);
			mgraphics.rectangle_rounded(x0, -CORNER_RADIUS, x1 - x0, vh + CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS);
			mgraphics.fill();
		}

		text = n.toString();
		size = mgraphics.text_measure(text);
		mgraphics.set_source_rgba(colorText);
		mgraphics.move_to(Math.round((x0 + x1 - size[0]) * 0.5), Math.round(vh - PADDING));
		mgraphics.show_text(text);

		mgraphics.set_source_rgba(getIsVoiceMuted(n) ? colorMuteOff : colorMuteOn);
		mgraphics.rectangle(
			Math.round((x0 + x1 - MUTE_SIZE) * 0.5),
			Math.round(vh - MUTE_OFFSET),
			MUTE_SIZE,
			MUTE_SIZE,
		);
		mgraphics.fill_preserve();
		mgraphics.set_source_rgba(colorMuteBorder);
		mgraphics.stroke();
	}
}

function onpointerdown(e: PointerEvent) {
	const { tw, vh } = getMeasurements();
	const i = Math.floor(e.clientX / tw);
	const n = i + 1;
	const mx = Math.round(i * tw + (tw - MUTE_SIZE) * 0.5);
	const my = Math.round(vh - MUTE_OFFSET);

	if (e.clientX >= mx &&
		e.clientX <= mx + MUTE_SIZE + 1 &&
		e.clientY >= my &&
		e.clientY <= my + MUTE_SIZE + 1
	) {
		const newIsMuted = !getIsVoiceMuted(n);
		voices.setVoiceParam("mute", n, newIsMuted ? 1 : 0);

		const param = voices.getVoiceParam("mute", n)!;
		outlet(OUTLET_SYNC, param);
		setPolyParam(n, param);
		refresh();
	}
	else {
		target(n);
	}
}


function bang() {
	if (inlet !== INLET_COMMAND) {
		return;
	}

	syncAllVoices();
}

function active(toggle: 1 | 0) {
	if (inlet !== INLET_COMMAND || typeof toggle !== "number") {
		return;
	}

	const state = toggle > 0;
	if (isActive !== state) {
		isActive = state;
		mgraphics.redraw();
	}
}

function target(n: number) {
	if (inlet !== INLET_COMMAND || !Number.isInteger(n)) {
		return;
	}

	setTarget(n);
}

function init(param: string, ...values: [ MaxValue, ...MaxValue[] ]) {
	if (inlet !== INLET_COMMAND || values.length === 0) {
		return;
	}

	voices.setParamDefault(param, ...values);
}

function set(param: string, ...values: [ MaxValue, ...MaxValue[] ]) {
	if (inlet !== INLET_COMMAND || values.length === 0) {
		return;
	}

	if (voices.setVoiceParam(param, undefined, ...values)) {
		setPolyParam(voices.getSelectedVoice(), [ param, ...values ]);
		refresh();
	}
}

function copy(n: number | "all") {
	if (inlet !== INLET_COMMAND || !(n === "all" || Number.isInteger(n))) {
		return;
	}

	if (n === "all") {
		voices.copyToAll();
		syncAllVoices();
		refresh();
	}
	else if (voices.copyTo(n)) {
		syncVoice(n);
		refresh();
	}
}

function solo(n: number) {
	if (inlet !== INLET_COMMAND || !Number.isInteger(n)) {
		return;
	}

	setSolo(n > 0);
}

function dictionary(name: string) {
	if (inlet !== INLET_RECALL || typeof name !== "string") {
		return;
	}

	if (voices.setBackingDict(name)) {
		syncAllVoices();
		refresh();
	}
}


getMeasurements.local = 1;
function getMeasurements() {
	const vw = mgraphics.size[0];
	const vh = mgraphics.size[1];
	return {
		vw,
		vh,
		tw: (vw + 1.0) / voices.getVoiceCount(),
	};
}

setColor.local = 1;
function setColor(color: string) {
	const rgba = max.getcolor(color);
	mgraphics.set_source_rgba(rgba);
}

getIsVoiceMuted.local = 1;
function getIsVoiceMuted(n: number) {
	const param = voices.getVoiceParam("mute", n);
	if (!param || param.length !== 2 || typeof param[1] !== "number") {
		return true; // default to muted
	}

	return param[1] > 0;
}


setPolyParam.local = 1;
function setPolyParam(n: number, param: VoiceParam) {
	if (param[0] === "mute") {
		outlet(OUTLET_POLY, "mute", n, param[1]);
		return;
	}

	if (polyTarget !== n) {
		polyTarget = n;
		outlet(OUTLET_POLY, "target", n);
	}

	outlet(OUTLET_POLY, param);
}

syncVoice.local = 1;
function syncVoice(n: number) {
	const params = voices.getVoiceParams(n);
	const selected = voices.getSelectedVoice();
	for (const param of params) {
		if (n === selected) {
			outlet(OUTLET_SYNC, param);
		}

		setPolyParam(n, param);
	}
}

syncAllVoices.local = 1;
function syncAllVoices() {
	const count = voices.getVoiceCount();
	for (let n = 1; n <= count; n += 1) {
		syncVoice(n);
	}
}

setTarget.local = 1;
function setTarget(n: number) {
	if (!voices.setSelectedVoice(n)) {
		return;
	}

	outlet(OUTLET_SYNC, [ "target", n ]);

	const params = voices.getVoiceParams();
	for (const param of params) {
		outlet(OUTLET_SYNC, param);
	}

	if (isSoloed) {
		setSolo(false);
	}

	mgraphics.redraw();
}

setSolo.local = 1;
function setSolo(enable: boolean) {
	const count = voices.getVoiceCount();
	const s = voices.getSelectedVoice();

	let n = 1;
	for (; n <= count; n += 1) {
		const isVoiceMuted = enable
			? n !== s
			: getIsVoiceMuted(n);

		outlet(OUTLET_POLY, [ "mute", n, isVoiceMuted ? 1 : 0 ]);
	}

	isSoloed = enable;
	outlet(OUTLET_SYNC, [ "solo", enable ? 1 : 0 ]);
}

refresh.local = 1;
function refresh() {
	outlet(OUTLET_RECALL, "dictionary", voices.getBackingDict());
	mgraphics.redraw();
}
