const path = require('path');

module.exports = {
  entry: './src/worklet/pitchProcessor.ts',
  output: {
    filename: 'pitchProcessor.bundle.js',
    path: path.resolve(__dirname, './public/js'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  target: 'webworker',
  mode: 'production',
};
