// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const vscode = require('vscode');
const { exec } = require('child_process');

// 判断某个命令是否存在shell中
function commandExistsInShell(shell, command, callback) {

	let execCommand = `type ${command}`;

	if (shell.includes('zsh')) {
		execCommand = `source ~/.zshrc &&  type ${command}`;
	}

	exec(execCommand, { shell }, (error, stdout, stderr) => {
		if (error) {
			console.warn(`Error: ${error.message}`);
			return callback(false);
		}
		if (stderr) {
			console.warn(`Stderr: ${stderr}`);
			return callback(false);
		}
		callback(true);
	});
}

function activate() {
	// 监听打开的terminal
	vscode.window.onDidOpenTerminal((terminal) => {
		// 获取工作区目录
		if (!vscode.workspace.workspaceFolders) {
			return;
		}

		// 获取工作区目录路径
		const path = vscode.workspace.workspaceFolders[0].uri.fsPath;

		// 获取package.json
		const packageJsonFilePath = join(path, '/package.json');

		// 检查打开的项目中是否有package.json
		if (!existsSync(packageJsonFilePath)) {
			return;
		}

		// 读取package.json
		let packageJsonString = readFileSync(
			packageJsonFilePath,
			'utf8'
		).toString();

		if (!packageJsonString) {
			return;
		}

		try {
			// 解析package.json
			const packageJson = JSON.parse(packageJsonString);

			// 检查是否有nodeVersion
			if (!packageJson.nodeVersion) return;

			const { nodeVersion } = packageJson;

			// 检查当前打开的shell中nvm是否存在
			// @ts-ignore
			const { shellPath } = terminal.creationOptions;

			commandExistsInShell(shellPath, 'nvm', (exists) => {
				if (exists) {
					// 检查版本是否存在，兼容zsh和fish终端
					let command = `source ~/.nvm/nvm.sh && nvm ls ${nodeVersion}`;

					if (shellPath.includes('fish')) {
						command = `nvm ls ${nodeVersion}`;
					}

					exec(command, { shell: shellPath }, (error, stdout, stderr) => {
						// 如果当前版本不存在，安装版本
						if (error) {
							vscode.window
								.showErrorMessage(
									`${nodeVersion}版本不存在，是否需要安装？`,
									'是',
									'否'
								)
								.then((value) => {
									if (value === '是') {
										// 安装版本，并切换
										terminal.sendText(`nvm install ${nodeVersion}`, true);
									}
								});
							return;
						}
						if (stderr) {
							vscode.window
								.showErrorMessage(
									`${nodeVersion}版本不存在，是否需要安装？`,
									'是',
									'否'
								)
								.then((value) => {
									if (value === '是') {
										// 安装版本，并切换
										terminal.sendText(`nvm install ${nodeVersion}`, true);
									}
								});
							return;
						}

						if (stdout) {
							// 切换版本
							terminal.sendText('nvm use ' + packageJson.nodeVersion, true);
						}
					});
				} else {
					vscode.window
						.showErrorMessage(
							'nvm命令不存在，请先安装。安装教程：',
							'查看安装教程',
							'否'
						)
						.then((value) => {
							if (value === '查看安装教程') {
								vscode.env.openExternal(
									vscode.Uri.parse('https://github.com/nvm-sh/nvm')
								);
							}
						});
				}
			});
		} catch (error) { }
	});
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate,
};
