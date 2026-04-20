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
						srcFile: "./dist/ui-eq.js",
						dstFile: "/Users/cdv/Documents/Max 9/Projects/Perc30/code/ui-eq.js",
					},
					{
						srcFile: "./dist/ui-harm.js",
						dstFile: "/Users/cdv/Documents/Max 9/Projects/Perc30/code/ui-harm.js",
					},
					{
						srcFile: "./dist/filterdesign.js",
						dstFile: "/Users/cdv/Documents/Max 9/Projects/Perc30/code/filterdesign.js",
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
	target.entry("filterdesign", "./src/filterdesign/index.ts");
	target.entry("ui-eq", "./src/ui-eq/index.ts");
	target.entry("ui-harm", "./src/ui-harm/index.ts");
});
