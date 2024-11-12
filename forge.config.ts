import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { Configuration } from 'webpack';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    osxSign: {} // object must exist even if empty
  },

  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
    {
      name: '@electron-forge/maker-dmg',
      config: {
        background: './assets/dmg-background.png',
        format: 'ULFO'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Alan Tracey Wootton',
          homepage: 'https://github.com/awootton/knotfree-local-hoster'
        }
      }
    }
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),

    //new WebpackPlugin(myWebpackConfig),
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: mainConfig , // './webpack.main.config.ts',
        renderer: {
          config: rendererConfig, // './webpack.renderer.config.ts',
          entryPoints: [{
            name: 'main_window',
            html: './src/index.html',
            js: './src/renderer.ts',
            preload: {
              js: './src/preload.ts'
            }
          }]
        }
      }
    },


    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],

  publishers: [
    {
      name: '@electron-forge/publisher-github',
      // platforms: ['darwin', 'linux'],
      config: {
        repository: {
          owner: 'awootton',
          name: 'knotfree-local-hoster',
        },
        prerelease: true
      }
    }
  ]


};

export default config;

// const myWebpackConfig : WebpackPluginConf = {
//   mainConfig : {

//   },
//   renderer: {
//   config: rendererConfig,
//   entryPoints: [
//     {
//       html: './src/index.html',
//       js: './src/renderer.ts',
//       name: 'main_window',
//       preload: {
//         js: './src/preload.ts',
//       },
//     },
//   ],
// },
// }


