import type { Configuration } from 'webpack';
import * as path from 'path';
import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/index.tsx',
  // Put your normal webpack config below here
  
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],

    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],    
  },
};
