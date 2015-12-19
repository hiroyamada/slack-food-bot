var utils = require('./utils.js');
var rp = require('request-promise');

exports.apiRoot = 'http://180.42.27.182/';
exports.ids = {
  'document': 10015,
  'teacher': 207
}

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
