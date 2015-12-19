var rp = require('request-promise');

module.exports = function(robot) {
  var that = this;
  that.apiRoot = 'http://180.42.27.182/document_analyzer/api/'
  that.currentTeacherId = 201;
  that.categoryId = 203;
  that.recordString = '';
  that.currentDocumentId = 10001;

  var debugMode = true;

  var generateOptions = function(endPoint, body) {
    return {
      method: 'POST',
      uri: that.apiRoot + endPoint,
      body: body,
      json: true // Automatically stringifies the body to JSON
    };
  }

  //現段階で抽出できたチャット内容(dataToSend)をUBICに送信。
  var sendDataToUBIC = function(dataToSend) {
    var options = generateOptions('document', {
      'documentId': that.currentDocumentId,
      'categoryId': that.categoryId,
      'text': dataToSend
    });
    return rp(options)
      .then(function(parsedBody) {
        console.log(parsedBody);
        that.currentDocumentId += 1;
        return parsedBody;
      })
      .catch(function(err) {
        console.log(err);
      });

  }

  var registerTeacher = function(chatDocumentId) {
    that.currentTeacherId += 1;
    var options = generateOptions('teacher', {
      'teacherId': that.currentTeacherId,
      'documents': {
        'relevant': [chatDocumentId]
      },
      'text': dataToSend,
      'categoryId': that.categoryId
    });
    return rp(options)
      .then(function(parsedBody) {
        console.log(parsedBody);
      })
      .catch(function(err) {
        console.log(err);
      });
  }


  //現段階で抽出できたチャット内容(dataToSend)をUBICに送信。
  var getResultsFromUBIC = function() {
    var options = generateOptions('learningResults', {
      'teacherId': currentTeacherId,
      'limit': 10
    });
    return rp(options)
      .then(function(parsedBody) {
        console.log(parsedBody);
      })
      .catch(function(err) {
        console.log(err);
      });
  }

  robot.hear(/(.+)/, function(res) {
    if (debugMode) {
      res.send('recording the string: ' + res.match[0]);
    }
    that.recordString += res.match[0];
  });

  var debugSend = function(string) {
    if (debugMode) {
      res.send(string);
    }
  }

  var onSendDataComplete = function(resolve, reject) {
    sendDataToUBIC(that.recordString).then(function(results) {
      switch (results.result) {
        case 'failed':
          res.send('failed. incrementing the documentId');
          onSendDataComplete(resolve, reject);
        case 'success':
          res.send('operation successful. Now wait for the result :)');
          resolve();
          break;
          res.send('ERROR. Unknown result ' + results.result);
      }
    }, function(error) {
      res.send('ERROR: ' + error);
      reject(error);
    });
  }

  var sendDataToUBICWithRetry = function(res, string) {
    return new Promise(onSendDataComplete);
  }

  //チャット内容を記録。regexを要編集。
  robot.hear(/どうよ/i, function(res) {
    res.send('ちょっとまって');
    sendDataToUBICWithRetry(res, that.recordString).then(function() {
      that.waitingForResponse = true;
      res.send('operation done');
    });
  });
}
