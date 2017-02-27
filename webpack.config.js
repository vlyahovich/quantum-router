module.exports = {
    entry: './src/router.ts',
    output: {
        path: __dirname + '/dist/es5',
        filename: 'router.js',
        libraryTarget: 'umd'
    },
    resolve: {
        extensions: ['.js', '.ts']
    },
    module: {
        loaders: [
            {test: /\.ts$/, exclude: /node_modules/, loader: 'ts-loader'}
        ]
    }
};
