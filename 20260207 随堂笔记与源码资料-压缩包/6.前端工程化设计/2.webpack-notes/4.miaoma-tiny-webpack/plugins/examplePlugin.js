class ExamplePlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('ExamplePlugin', (compilation, callback) => {
      console.log('ExamplePlugin is working!');
      callback();
    });
  }
}

module.exports = ExamplePlugin;
