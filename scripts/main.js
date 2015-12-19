var rp = require('request-promise');
var CronJob = require('cron').CronJob;

module.exports = function(robot) {
  var that = this;

  var job = new CronJob({
  	// cronTime: '00 00 17 * * 1-5',
  	cronTime: '00 20 21 * * *',
  	onTick: function() {
  		console.log('ご飯に行こうよ');
  		res.send('ご飯に行こうよ');
    /*
     * Runs every weekday (Monday through Friday)
     * mt 17:00:00 PM. It does not run on Saturday or Sunday.
     */
  	},
  	start: false
  });
  job.start();

  that.apiRoot = 'http://180.42.27.182/';
  that.ids = {
    'document': 10015,
    'teacher': 207
  }

  that.categoryId = 203;
  that.recordString = '';
  that.latestRes = null;

  //現在地
  that.currentLocation = null;

  //人数
  that.numPeople = null;

  //メンバー
  that.member = [];

  //目的
  that.purpose = [];

  var debugMode = true;

  var generateOptions = function(endPoint, body) {
    return {
      method: 'POST',
      uri: that.apiRoot + endPoint,
      body: body,
      json: true // Automatically stringifies the body to JSON
    };
  }

  /*
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
  */

  //現段階で抽出できたチャット内容(dataToSend)をUBICに送信。
  var getResultsFromUBIC = function() {
    console.log(that.ids['teacher']);
    var options = generateOptions('relevance_evaluator/api/leaningResult', {
      'teacherId': that.ids['teacher'],
      'limit': 10,
      'categoryId': that.categoryId
    });
    console.log(options);
    return rp(options);
  };

  /*
    var onSendDataComplete = function(resolve, reject, res) {
      sendDataToUBIC(that.recordString).then(function(results) {
        switch (results.result) {
          case 'failed':
            res.send('failed. incrementing the documentId');
            that.currentDocumentId += 1;
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

    var onRegisterTeacher = function(resolve, reject, res) {
      registerTeacher(that.recordString).then(function(results) {
        switch (results.result) {
          case 'failed':
            res.send('failed. incrementing the teacherId');
            that.currentTeacherId += 1;
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
  */
  var postExecuter = function(resolve, reject, res, endPoint, idKey, options) {
    // super hacky but whatever
    options.body[idKey + 'Id'] = parseInt(that.ids[idKey]);
    console.log(options);

    rp(options).then(function(results) {
      switch (results.result) {
        case 'failed':
          res.send('failed. incrementing the ' + idKey + 'Id');
          that.ids[idKey] += 1;
          postExecuter(resolve, reject, res, endPoint, idKey, options);
          break;
        case 'success':
          console.log("id that was successful: " + that.ids[idKey]);
          resolve();
          break;
          res.send('ERROR. Unknown result ' + results.result);
      }
    });
  }

  var postWithRetry = function(res, endpoint, idKey, options) {
    return new Promise(function(resolve, reject) {
      postExecuter(resolve, reject, res, endpoint, idKey, options);
    })
  }

  var sendDataToUBICWithRetry = function(res) {
    var options = generateOptions('document_analyzer/api/document', {
      'documentId': that.ids['document'],
      'categoryId': that.categoryId,
      'text': that.recordString
    });
    return postWithRetry(res, 'document', 'document', options);
  }

  var registerTeacherWithRetry = function(res) {
    console.log(that.ids['document']);
    var options = generateOptions('relevance_evaluator/api/teacher', {
      'teacherId': that.ids['teacher'],
      'documents': {
        'relevant': [parseInt(that.ids['document'])]
      },
      'categoryId': that.categoryId
    });
    console.log(options);
    return postWithRetry(res, 'teacher', 'teacher', options);
  }

  setInterval(function() {
    if (that.waitingForResponse) {
      getResultsFromUBIC().then(function(payload) {
        switch (payload.result) {
          case 'success':
            that.latestRes.send('here are the results!');
            that.latestRes.send(payload.documents);
            that.waitingForResponse = false;
            break;
          case 'nowLearning':
            that.latestRes.send('ちょっと待ってね');
            break;
            that.latestRes.send('ERROR: ' + payload.result);
        }
        console.log(payload);
      })
    }
  }, 1000);

  robot.hear(/(.+)/, function(res) {
  	console.log('your id: ' + res.message.user.id);
  	res.send('your id: ' + res.message.user.id);
  	if (!that.member.indexOf(res.message.user.id) < 1) {
  		that.member.push(res.message.user.id);
  		console.log('Add id: ' + res.message.user.id);
  		res.send('Add id: ' + res.message.user.id);
  	};  	
    if (debugMode) {
      res.send('recording the string: ' + res.match[0]);
    }
    that.recordString += res.match[0];
  });

  robot.hear(/どうよ/i, function(res) {
    that.latestRes = res;
    if (that.waitingForResponse) {
      res.send('落ち着け');
    }
    res.send('ちょっとまって');
    sendDataToUBICWithRetry(res).then(function() {
      registerTeacherWithRetry(res).then(function() {
        res.send('operation done!');
        that.waitingForResponse = true;
      });
    });
  });
}
