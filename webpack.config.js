const nodeExternals = require('webpack-node-externals')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const WebpackAssetsManifest = require('webpack-assets-manifest')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const watch = process.env.NODE_ENV !== 'production'
const mode =
  process.env.NODE_ENV === 'production' ? 'production' : 'development'

module.exports = [
  {
    // Client
    entry: ['./scripts/testSerumOrderbook.js'],
    watch,
    mode,
    resolve: {
      extensions: ['.ts', '.tsx', '.js']
    },
    output: {
      filename: 'public/bundle.js',
      assetModuleFilename: 'public/assets/[hash][ext][query]',
    },
    module: {
      rules: [
        {
          test: /\.png$/,
          type: 'asset/resource',
        },
        {
          test: /\.m?js$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
            },
          },
        }
      ],
    },
    plugins: [
      new NodePolyfillPlugin(),
      new WebpackAssetsManifest({}),
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
      })
    ],
  },
]
