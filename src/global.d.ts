declare const box: Box;

declare const max: MaxObject;

declare const mgraphics: MGraphics;

declare let inlets: number;

declare let outlets: number;


declare function outlet(n: number, args: MaxValue[]): void;
declare function outlet(n: number, ...args: MaxValue[]): void;

type MaxValue = number | string;


interface Box {
	readonly rect: Rect;
}

type Rect = readonly [ left: number, top: number, right: number, bottom: number ];


interface MaxObject {
	getcolor(name: string): RGBA;
}

type RGBA = readonly [ r: number, g: number, b: number, a: number ];


interface MGraphics {
	autofill: 1 | 0;
	relative_coords: 1 | 0;
	ellipse(x: number, y: number, w: number, h: number): void;
	fill(): void;
	init(): void;
	line_to(x: number, y: number): void;
	move_to(x: number, y: number): void;
	redraw(): void;
	rectangle(x: number, y: number, w: number, h: number): void;
	set_line_cap(cap: "butt" | "round" | "square"): void;
	set_line_join(join: "miter" | "round" | "bevel"): void;
	set_line_width(w: number): void;
	set_source_rgba(r: number, g: number, b: number, a: number): void;
	stroke(): void;
}
