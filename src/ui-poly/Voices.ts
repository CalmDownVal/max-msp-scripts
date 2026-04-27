export type VoiceParam = readonly [ name: string, value0: MaxValue, ...valueN: MaxValue[] ];

interface Voice {
	params: { [P in string]?: VoiceParam };
	names: string[];
}

const RE_KEY = /^v([0-9]+)(.+)$/;

export class Voices {
	private readonly defaults: Voice = {
		params: {},
		names: [],
	};

	private dict = new Dict();
	private voices: Voice[] = [];
	private selectedVoiceN = 1;

	public constructor(count: number) {
		let n = 0;
		for (; n < count; n += 1) {
			this.voices.push({
				params: {},
				names: [],
			});
		}

		this.setVoiceParam("mute", 1, 0);
	}

	public getVoiceCount() {
		return this.voices.length;
	}

	public getSelectedVoice() {
		return this.selectedVoiceN;
	}

	public setSelectedVoice(n: number) {
		if (n === this.selectedVoiceN || !this.isValidVoice(n)) {
			return false;
		}

		this.selectedVoiceN = n;
		return true;
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

		for (const voice of this.voices) {
			voice.params = { ...this.defaults.params };
			voice.names = [ ...this.defaults.names ];
		}

		const keys = dict.getkeys();
		if (!keys) {
			return true;
		}

		for (const key of keys) {
			const match = RE_KEY.exec(key);
			if (!match) {
				continue;
			}

			const n = Number(match[1]);
			if (!this.isValidVoice(n)) {
				continue;
			}

			const voice = this.voices[n - 1];
			const value = dict.get(key);
			voice.params[match[2]] = [ match[2], ...(Array.isArray(value) ? value : [ value ]) ] as unknown as VoiceParam;
			voice.names.push(match[2]);
		}

		return true;
	}

	public getVoiceParams(n: number = this.selectedVoiceN) {
		const voice = this.getVoice(n);
		return voice
			? voice.names.map(name => voice.params[name]!)
			: [];
	}

	public getVoiceParam(param: string, n: number = this.selectedVoiceN) {
		const voice = this.getVoice(n);
		return voice
			? voice.params[param] ?? null
			: null;
	}

	public setVoiceParam(param: string, n: number = this.selectedVoiceN, ...value: [ MaxValue, ...MaxValue[] ]) {
		const voice = this.getVoice(n);
		if (!voice) {
			return false;
		}

		const prev = voice.params[param];
		if (prev) {
			const isEqual = (
				prev.length === value.length + 1 &&
				value.every((v, i) => prev[i + 1] === v)
			);

			if (isEqual) {
				return false;
			}
		}
		else {
			voice.names.push(param);
		}

		voice.params[param] = [ param, ...value ];
		this.dict?.set(`v${n}${param}`, ...value);
		return true;
	}

	public setParamDefault(param: string, ...value: [ MaxValue, ...MaxValue[] ]) {
		const prev = this.defaults.params[param];
		const next: VoiceParam = [ param, ...value ];
		for (const voice of this.voices) {
			const tmp = voice.params[param];
			if (tmp === undefined) {
				voice.params[param] = next;
				voice.names.push(param);
			}
			else if (tmp === prev) {
				voice.params[param] = next;
			}
		}

		this.defaults.params[param] = next;
		if (!prev) {
			this.defaults.names.push(param);
		}

		return true;
	}

	public copyTo(n: number) {
		if (n === this.selectedVoiceN || !this.getVoice(n)) {
			return false;
		}

		const src = this.getVoiceParams();
		for (const [ param, ...value ] of src) {
			this.setVoiceParam(param, n, ...value);
		}

		return true;
	}

	public copyToAll() {
		let n = 1;
		for (; n <= this.voices.length; n += 1) {
			this.copyTo(n);
		}

		return true;
	}


	private isValidVoice(n: number) {
		return Number.isInteger(n) && n >= 1 && n <= this.voices.length;
	}

	private getVoice(n: number) {
		return this.isValidVoice(n) ? this.voices[n - 1] : null;
	}
}
