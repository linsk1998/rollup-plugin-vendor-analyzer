

const node_modules = "/node_modules/";

module.exports = function analyzer(options) {
	options = options || {};
	var allowList = options.allowList || options.whiteList;
	var blockList = options.blockList || options.blackList || ['lodash-utils'];
	var packageCountWarning = options.packageCountWarning || 20;

	/** 包中的模块使用数 */
	var packageCount = new Map();
	/** 包中的模块完整路径 */
	var packagePaths = new Map();

	return {
		transform(code, id) {
			var filePath = id.replace(/\\/g, "/");
			var lastIndex = filePath.lastIndexOf(node_modules);
			if(lastIndex < 0) {
				return;
			}
			var packagePath = filePath.substr(0, lastIndex);
			var packageName = filePath.substr(lastIndex + node_modules.length);
			if(packageName.startsWith("@")) {
				let arr = packageName.split("/");
				arr.length = 2;
				packageName = arr.join("/");
			} else {
				packageName = packageName.split("/")[0];
			}
			if(packageCount.has(packageName)) {
				let count = packageCount.get(packageName);
				count++;
				packageCount.set(packageName, count);
			} else {
				packageCount.set(packageName, 0);
			}
			if(packagePaths.has(packageName)) {
				let set = packagePaths.get(packageName);
				set.add(packagePath);
			} else {
				let set = new Set();
				set.add(set);
				packagePaths.set(packageName, set);
			}
		},
		generateBundle(options, bundle) {
			var countArray = [];
			packageCount.forEach((count, packageName) => {
				countArray.push({
					count: count,
					packageName: packageName
				});
			});
			countArray.sort((a, b) => b.count - a.count);
			console.log("Vendors count:", countArray.length);
			countArray.forEach(({ count, packageName }) => {
				console.log(count, packageName);
			});
			var ids = this.getModuleIds();
			countArray.forEach(({ count, packageName }) => {
				if(count >= packageCountWarning) {
					let importedBy = [];
					ids.forEach((id) => {
						var filePath = id.replace(/\\/g, "/");
						var lastIndex = filePath.lastIndexOf(node_modules);
						if(lastIndex < 0) {
							return;
						}
						var packagePath = filePath.substr(0, lastIndex);
						var pn = filePath.substr(lastIndex + node_modules.length);
						if(pn == packageName) {
							let moduleInfo = this.getModuleInfo();
							var importers = moduleInfo.importers;
							if(importers) {
								if(importers.every(importer => !importer.replace(/\\/g, "/").startsWith(packagePath))) {
									importedBy = importedBy.concat(importers);
								}
							}
						}
					});
					console.log(packageName, "imported by", importedBy);
				}
			});
			packagePaths.forEach((packagePath, packageName) => {
				if(packagePath.size > 1) {
					console.log(packageName, "has", packagePath.size, "version", Array.from(packagePath));
				}
			});
			if(allowList) {
				packageCount.forEach((count, packageName) => {
					if(!allowList.includes(packageName)) {
						console.warn(packageName, "is NOT ALLOW");
					}
				});
			} else {
				packageCount.forEach((count, packageName) => {
					if(blockList.includes(packageName)) {
						console.warn(packageName, "is BLOCK");
					}
				});
			}
		}
	};
};
analyzer.default = analyzer;

