const path = require('path');
const { NODE_ENV = "production" } = process.env;

module.exports = {
	"entry": "./src/index.ts",
	"mode": NODE_ENV,
	"target": "node",
	"output": {
		"path": path.resolve(__dirname, "dist"),
		"filename": "[name].js",
	},
	"resolve": {
		"alias": {
			"@": path.resolve(__dirname, "src"),
		},
		"extensions": [".ts", ".js", ".json"],
	},
	"module": {
		"rules": [
			{
				"test": /\.ts$/,
				"loader": "ts-loader",
				"exclude": /node-modules/,
			},
		],
	},
};
