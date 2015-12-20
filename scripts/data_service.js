var fs = require('fs');

exports.data = null;

exports.loadData = function() {
  fs.readFile('./tempo.json', 'utf8', function(err, file) {
    exports.data = JSON.parse(file);
  });
};

exports.getStore = function(id) {
  console.log(id);
  if (exports.data !== null) {
    return exports.data[id - 1];
  } else {
    return null;
  }
};
