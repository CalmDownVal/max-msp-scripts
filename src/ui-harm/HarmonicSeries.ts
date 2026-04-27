import { clamp, TAU } from "./common";

export class HarmonicSeries {
	private dict = new Dict();
	private amplitude: number[] = [];
	private phase: number[] = [];
	private count = 0;

	public constructor(count: number) {
		this.setBinCount(count);
		this.makeSine();
	}

	public getCount() {
		return this.count;
	}

	public getAmplitude(n: number) {
		return this.amplitude[n] ?? 0.0;
	}

	public getPhase(n: number) {
		return this.phase[n] ?? 0.0;
	}

	public getAmplitudeAt(phasor: number) {
		const { amplitude, phase, count } = this;
		let amp = 0.0;
		let mag = 0.0;
		let n = 0;

		for (; n < count; n += 1) {
			amp -= Math.sin(phasor * (n + 1.0) + phase[n]) * amplitude[n];
			mag += amplitude[n];
		}

		return amp / Math.max(mag, 0.1);
	}

	public getBackingDict() {
		return this.dict.name;
	}

	public setBackingDict(name: string) {
		if (this.dict.name === name) {
			return false;
		}

		const dict = new Dict(name);
		this.dict = dict;

		let count = dict.get("bins");
		if (typeof count !== "number") {
			count = this.count;
		}

		const { amplitude, phase } = this;

		let n = 0;
		let a;
		let p;

		this.count = count;
		amplitude.length = count;
		phase.length = count;

		for (; n < count; n += 1) {
			a = dict.get(`a${n}`);
			a = typeof a === "number" ? clamp(a) : 0.0;

			p = dict.get(`p${n}`);
			p = typeof p === "number" ? wrap(p) : 0.0;

			amplitude[n] = a;
			phase[n] = p;
		}

		return true;
	}

	public toBuffer(buffer: Buffer) {
		buffer.poke(1, 0, this.amplitude);
		buffer.poke(2, 0, this.phase);
	}

	public setBinCount(n: number) {
		const count = clamp(Math.trunc(n), 1, 128);
		const { amplitude, phase, dict } = this;

		if (count < this.count) {
			amplitude.length = count;
			phase.length = count;

			let i = this.count - 1;
			while (i >= count) {
				dict.remove(`a${i}`);
				dict.remove(`p${i}`);
				i -= 1;
			}
		}
		else if (count > this.count) {
			let i = this.count;
			for (; i < count; i += 1) {
				amplitude.push(0.0);
				phase.push(0.0);
				dict.set(`a${i}`, 0.0);
				dict.set(`p${i}`, 0.0);
			}
		}
		else {
			return false;
		}

		this.count = count;
		dict.set("bins", count);
		return true;
	}

	public setAmplitude(n: number, amplitude: number) {
		if (n < 0 || n >= this.count) {
			return false;
		}

		const clamped = clamp(amplitude);
		if (this.amplitude[n] === clamped) {
			return false;
		}

		this.amplitude[n] = clamped;
		this.dict.set(`a${n}`, clamped);
		return true;
	}

	public setPhase(n: number, phase: number) {
		if (n < 0 || n >= this.count) {
			return false;
		}

		const wrapped = wrap(phase);
		if (this.phase[n] === wrapped) {
			return false;
		}

		this.phase[n] = wrapped;
		this.dict.set(`p${n}`, wrapped);
		return true;
	}

	public makeSine() {
		const { amplitude, phase, count } = this;
		amplitude[0] = 1.0;
		phase[0] = 0.0;

		let n = 1;
		for (; n < count; n += 1) {
			amplitude[n] = 0.0;
			phase[n] = 0.0;
		}

		this.syncDict();
	}

	public makeTriangle() {
		const { amplitude, phase, count } = this;

		let n = 0;
		for (; n < count; n += 1) {
			amplitude[n] = (n % 2) === 0 ? 1.0 / Math.pow(n + 1.0, 2.0) : 0.0;
			phase[n] = (n % 4) === 0 ? 0.0 : Math.PI;
		}

		this.syncDict();
	}

	public makeSquare() {
		const { amplitude, phase, count } = this;

		let n = 0;
		for (; n < count; n += 1) {
			amplitude[n] = (n % 2) === 0 ? 1.0 / (n + 1.0) : 0.0;
			phase[n] = 0.0;
		}

		this.syncDict();
	}

	public makeSawtooth() {
		const { amplitude, phase, count } = this;

		let n = 0;
		for (; n < count; n += 1) {
			amplitude[n] = 1.0 / (n + 1.0);
			phase[n] = 0.0;
		}

		this.syncDict();
	}

	private syncDict() {
		const { amplitude, phase, count, dict } = this;

		let n = 0;
		for (; n < count; n += 1) {
			dict.set(`a${n}`, amplitude[n]);
			dict.set(`p${n}`, phase[n]);
		}
	}
}

wrap.local = true;
function wrap(p: number) {
	let w = p % TAU;
	if (w > Math.PI) {
		w -= TAU;
	}
	else if (w < -Math.PI) {
		w += TAU;
	}

	return w;
}
