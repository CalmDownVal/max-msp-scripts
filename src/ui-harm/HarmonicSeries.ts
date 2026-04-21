import { clamp, TAU } from "./common";

export class HarmonicSeries {
	private amplitude: number[] = [];
	private phase: number[] = [];
	private count = 0;

	public constructor(count: number = 10) {
		this.setBinCount(count);
		this.makeSine();
	}

	public getAmplitudes(): readonly number[] {
		return this.amplitude;
	}

	public getPhases(): readonly number[] {
		return this.phase;
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

	public setBinCount(n: number) {
		const count = clamp(Math.round(n), 1, 128);
		const { amplitude, phase } = this;

		if (count < this.count) {
			amplitude.length = count;
			phase.length = count;
		}
		else if (count > this.count) {
			let i = this.count;
			for (; i < count; i += 1) {
				amplitude.push(0.0);
				phase.push(0.0);
			}
		}
		else {
			return false;
		}

		this.count = count;
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
		return true;
	}

	public setPhase(n: number, phase: number) {
		if (n < 0 || n >= this.count) {
			return false;
		}

		let clamped = phase % TAU;
		if (clamped > Math.PI) {
			clamped -= TAU;
		}
		else if (clamped < -Math.PI) {
			clamped += TAU;
		}

		if (this.phase[n] === clamped) {
			return false;
		}

		this.phase[n] = clamped;
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
	}

	public makeTriangle() {
		const { amplitude, phase, count } = this;

		let n = 0;
		for (; n < count; n += 1) {
			amplitude[n] = (n % 2) === 0 ? 1.0 / Math.pow(n + 1.0, 2.0) : 0.0;
			phase[n] = (n % 4) === 0 ? 0.0 : Math.PI;
		}
	}

	public makeSquare() {
		const { amplitude, phase, count } = this;

		let n = 0;
		for (; n < count; n += 1) {
			amplitude[n] = (n % 2) === 0 ? 1.0 / (n + 1.0) : 0.0;
			phase[n] = 0.0;
		}
	}

	public makeSawtooth() {
		const { amplitude, phase, count } = this;

		let n = 0;
		for (; n < count; n += 1) {
			amplitude[n] = 1.0 / (n + 1.0);
			phase[n] = 0.0;
		}
	}
}
