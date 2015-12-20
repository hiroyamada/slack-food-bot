var utils = require('./utils.js');
var rp = require('request-promise');
var fs = require('fs');

exports.storeDebug = true;

exports.apiRoot = 'http://180.42.27.182/';
exports.ids = {
  'document': 10056,
  'teacher': 225
}

fs.readFile("./ids.json", function(err, file) {
  exports.ids = JSON.parse(file);
});

exports.categoryId = 203;
exports.recordString = '';
exports.latestRes = null;


var generateOptions = function(endPoint, body) {
  return {
    method: 'POST',
    uri: exports.apiRoot + endPoint,
    body: body,
    json: true // Automatically stringifies the body to JSON
  };
}


//現段階で抽出できたチャット内容(dataToSend)をUBICに送信。
exports.getResultsFromUBIC = function() {
  if (exports.storeDebug) {
    return new Promise(function(resolve, reject) {
      resolve({
        'result': 'success',
        'documents': [{
          'documentId': 10026,
          'score': 10000
        }, {
          'documentId': 112,
          'score': 9000
        }]
      });
    });
  }

  var options = generateOptions('relevance_evaluator/api/leaningResult', {
    'teacherId': exports.ids['teacher'],
    'limit': 10,
    'categoryId': exports.categoryId
  });
  console.log(options);
  return rp(options);
};

var postExecuter = function(resolve, reject, res, endPoint, idKey, options) {
  // super hacky but whatever
  options.body[idKey + 'Id'] = parseInt(exports.ids[idKey]);
  console.log(options);

  rp(options).then(function(results) {
    console.log("response");
    switch (results.result) {
      case 'failed':
        res.send('failed. incrementing the ' + idKey + 'Id');
        exports.ids[idKey] += 1;
        fs.writeFile('./ids.json', JSON.stringify(exports.ids));
        postExecuter(resolve, reject, res, endPoint, idKey, options);
        break;
      case 'success':
        resolve();
        break;
        res.send('ERROR. Unknown result ' + results.result);
    }
  }).catch(function(error) {
    console.log(error);
  });
  console.log("reaching here");
}

var postWithRetry = function(res, endpoint, idKey, options) {
  console.log("here");
  return new Promise(function(resolve, reject) {
    postExecuter(resolve, reject, res, endpoint, idKey, options);
  })
}

exports.sendDataToUBICWithRetry = function(res) {
  var options = generateOptions('document_analyzer/api/document', {
    'documentId': exports.ids['document'],
    'categoryId': exports.categoryId,
    'text': exports.recordString
  });
  return postWithRetry(res, 'document', 'document', options);
}

exports.registerTeacherWithRetry = function(res) {
  var options = generateOptions('relevance_evaluator/api/teacher', {
    'teacherId': exports.ids['teacher'],
    'documents': {
      'relevant': [parseInt(exports.ids['document'])]
    },
    'categoryId': exports.categoryId
  });
  return postWithRetry(res, 'teacher', 'teacher', options);
}

exports.initiateQuery = function(res) {
  if (res) {
    exports.latestRes = res;
  }
  exports.latestRes.send('ちょっとまってて。今計算中。。。');
  if (exports.waitingForResponse) {
    utils.debugSend('already waiting for response');
    return;
  }
  console.log("here1");
  exports.sendDataToUBICWithRetry(exports.latestRes).then(function() {
    console.log("here2");
    exports.registerTeacherWithRetry(exports.latestRes).then(function() {
      console.log("here3");
      exports.latestRes.send('operation done!');
      exports.waitingForResponse = true;
    });
  });
}
