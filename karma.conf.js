const webpack = require('webpack');

module.exports = function (config) {
    config.set({
        browsers: ['PhantomJS'],
        files: [
            'bootstrap.spec.ts'
        ],
        frameworks: ['mocha', 'chai', 'es6-shim'],
        preprocessors: {
            'bootstrap.spec.ts': ['webpack']
        },
        webpack: {
            resolve: {
                extensions: ['.js', '.ts']
            },
            module: {
                loaders: [{
                    test: /\.ts/,
                    exclude: /node_modules/,
                    loader: 'ts-loader'
                }]
            },
            watch: true
        },
        singleRun: true,
        webpackServer: {
            noInfo: true
        }
    });
};
