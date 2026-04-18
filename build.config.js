import { definePlugin, defineTarget, inProduction, inWatchMode } from "@calmdown/rolldown-workspace";

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
