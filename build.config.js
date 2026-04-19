import { definePlugin, defineTarget, inWatchMode } from "@calmdown/rolldown-workspace";

const CopyPlugin = definePlugin(
	"Copy",
	async () => (await import("@calmdown/rollup-plugin-copy")).default,
);

const DeletePlugin = definePlugin(
	"Delete",
	async () => (await import("@calmdown/rollup-plugin-delete")).default,
);

const MaxV8UITarget = defineTarget("MaxV8UI", target => target
	.configure({
		platform: "neutral",
		tsconfig: "./tsconfig.json",
		treeshake: false,
	})
	.pipeline("Code", pipe => pipe
		.plugin(DeletePlugin
			.disable(inWatchMode)
			.configure({
				targets: "./dist/**/*",
			})
		)
		.plugin(CopyPlugin
			// .disable()
			.configure({
				targets: [
					{
						srcFile: "./dist/eq.js",
						dstFile: "/Users/cdv/Documents/Max 9/Projects/cdKick/code/eq.js",
					},
				],
			})
		)
		.output("Main", out => out
			.configure(() => ({
				dir: "./dist",
				format: "es",
				comments: false,
				minify: false,
			}))
		)
	)
);

MaxV8UITarget.build(target => {
	target.entry("eq", "./src/eq/index.ts");
});
