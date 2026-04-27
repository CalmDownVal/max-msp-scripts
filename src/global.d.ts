declare const box: Box;

declare const max: MaxObject;

declare const mgraphics: MGraphics;

declare const messagename: string;

declare const inlet: number;

declare const jsarguments: readonly MaxValue[];

declare let inlets: number;

declare let outlets: number;


declare function post(...args: unknown): void;

declare function outlet(n: number, args: readonly MaxValue[]): void;
declare function outlet(n: number, ...args: MaxValue[]): void;

declare function outlet_array(n: number, array: readonly MaxValue[]): void;

declare function arrayfromargs(arguments: object): MaxValue[];
declare function arrayfromargs(message: string, arguments: object): MaxValue[];

type MaxValue = number | string;


interface Box {
	readonly rect: Rect;
}

type Rect = readonly [ left: number, top: number, right: number, bottom: number ];

type Size = readonly [ width: number, height: number ];


interface MaxObject {
	getcolor(name: string): RGBA;
}

type RGBA = readonly [ r: number, g: number, b: number, a: number ];


// https://docs.cycling74.com/apiref/js/pointerevent/
interface PointerEvent {
	clientX: number;
	clientY: number;
}

// https://docs.cycling74.com/apiref/js/mgraphics/
declare class MGraphics {
	readonly size: Size;
	autofill: 1 | 0;
	relative_coords: 1 | 0;
	constructor(width: number, height: number);
	ellipse(x: number, y: number, w: number, h: number): void;
	fill(): void;
	fill_preserve(): void;
	init(): void;
	line_to(x: number, y: number): void;
	move_to(x: number, y: number): void;
	redraw(): void;
	rectangle(x: number, y: number, w: number, h: number): void;
	rectangle_rounded(x: number, y: number, width: number, height: number, ovalwidth: number, ovalheight: number): void;
	select_font_face(fontname: string, bold?: "bold", italic?: "italic"): void;
	set_font_size(fontsize: number): void;
	set_line_cap(cap: "butt" | "round" | "square"): void;
	set_line_join(join: "miter" | "round" | "bevel"): void;
	set_line_width(w: number): void;
	set_source_rgba(rgba: RGBA): void;
	set_source_rgba(r: number, g: number, b: number, a: number): void;
	show_text(text: string): void;
	stroke(): void;
	text_measure(text: string): Size;
}

// https://docs.cycling74.com/apiref/js/buffer/
declare class Buffer {
	constructor(name: string);
	create(name?: string, filename?: string, duration?: number, channelcount?: number): void;
	freepeer(): void;
	poke(channel: number, frame: number, samples: number | readonly number[]): void;
}

// https://docs.cycling74.com/apiref/js/liveapi/
declare class LiveAPI {
	property: string;
	valid: number;
	constructor(callback?: Function, path?: string);
	get(property: string): number | number[];
	goto(path: string): void;
}

// https://docs.cycling74.com/apiref/js/task/#schedule
declare class Task {
	constructor<TArgs extends unknown[], TThis = never>(fn: (this: TThis, ...args: TArgs) => void, obj?: TThis, args?: TArgs);
	schedule(delay?: number): void;
}

// https://docs.cycling74.com/apiref/js/dict/
declare class Dict {
	readonly name: string;
	constructor(name?: string);
	get(key: string): any;
	getkeys(): readonly string[] | null;
	remove(key: string): void;
	replace(key: string, ...value: any[]): void;
	set(key: string, ...value: any[]): void;
}
