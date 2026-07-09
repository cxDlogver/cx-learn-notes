import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { downloadArtifact } from '@electron/get';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const desktopPackageJsonPath = path.join(rootDir, 'apps/desktop/package.json');
const desktopRequire = createRequire(desktopPackageJsonPath);
const electronPackagePath = desktopRequire.resolve('electron/package.json');
const electronDir = path.dirname(electronPackagePath);
const electronPackage = JSON.parse(fs.readFileSync(electronPackagePath, 'utf8'));
const platform = process.env.npm_config_platform || process.platform;
const arch = process.env.npm_config_arch || process.arch;
const mirror =
    process.env.ELECTRON_MIRROR ||
    process.env.npm_config_electron_mirror ||
    'https://npmmirror.com/mirrors/electron/';

const platformPathByName = {
    darwin: 'Electron.app/Contents/MacOS/Electron',
    freebsd: 'electron',
    linux: 'electron',
    openbsd: 'electron',
    win32: 'electron.exe'
};

const platformPath = platformPathByName[platform];

function ensurePackageBinExecutables(packageName) {
    if (os.platform() === 'win32') {
        return;
    }

    const packageJsonPath = desktopRequire.resolve(`${packageName}/package.json`);
    const packageDir = path.dirname(packageJsonPath);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const binEntries =
        typeof packageJson.bin === 'string' ? [packageJson.bin] : Object.values(packageJson.bin ?? {});

    for (const binEntry of binEntries) {
        const binPath = path.join(packageDir, binEntry);

        if (fs.existsSync(binPath)) {
            fs.chmodSync(binPath, 0o755);
        }
    }
}

if (!platformPath) {
    throw new Error(`Electron builds are not available on platform: ${platform}`);
}

const zipPath = await downloadArtifact({
    version: electronPackage.version,
    artifactName: 'electron',
    platform,
    arch,
    force: true,
    mirrorOptions: {
        mirror
    }
});

const distDir = path.join(electronDir, 'dist');
fs.mkdirSync(distDir, { recursive: true });

execFileSync('unzip', ['-o', '-q', zipPath, '-d', distDir], {
    stdio: 'inherit'
});

fs.writeFileSync(path.join(electronDir, 'path.txt'), platformPath);

const electronExecutable = path.join(distDir, platformPath);

if (!fs.existsSync(electronExecutable)) {
    throw new Error(`Electron executable was not found: ${electronExecutable}`);
}

if (os.platform() !== 'win32') {
    fs.chmodSync(electronExecutable, 0o755);
}

ensurePackageBinExecutables('electron');
ensurePackageBinExecutables('@electron-forge/cli');

console.log(`Electron ${electronPackage.version} installed at ${electronExecutable}`);
