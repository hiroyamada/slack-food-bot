var rp = require('request-promise');
var ubic_service = require('./ubic_service.js');
var utils = require('./utils.js');
var data_service = require('./data_service.js');
var place_service = require('./place_service.js');

module.exports = function(robot) {
  data_service.loadData();
  var that = this;

  //現在地
  that.currentLocation = null;

  //人数
  that.numPeople = null;

  //目的
  that.purpose = [];

  //アクティブかどうか
  that.active = false;

  //アクティブでかつ現在待ってる計算結果がある場合サーバーにリクエストを送信
  setInterval(function() {
    if (ubic_service.waitingForResponse && that.active) {
      ubic_service.getResultsFromUBIC().then(function(payload) {
        switch (payload.result) {
          case 'success':
            ubic_service.latestRes.send('ここなんてどう？');
            ubic_service.waitingForResponse = false;
            console.log(payload);
            for (var i = 0; i < 10; i++) {
              var document_object = payload.documents[i];
              console.log(document_object);
              var store = data_service.getStore(parseInt(document_object.documentId));
              console.log(store);
              if (store) {
                console.log(store['review']);
                ubic_service.latestRes.send(store['review']);
                ubic_service.latestRes.send(store['address']);
                break;
              } else {
                continue;
              }
            }
            break;
          case 'nowLearning':
            utils.debugSend(ubic_service.latestRes, 'ちょっと待ってね');
            break;
            ubic_service.latestRes.send('ERROR: ' + payload.result);
        }
        console.log(payload);
      })
    }
  }, 5000);

  //60秒ごとに（アクティブであれば）いままでのチャット履歴をサーバーに送信
  setInterval(function() {
    if (that.active) {
      ubic_service.initiateQuery
    }
  }, 60000);

  //アクティブかどうかの切り替え
  that.setStatus = function(res, status) {
    that.active = status;
    res.send('status set to ' + status);

    //オフにするコマンドであれば、今までのチャット履歴をリセット
    if (!status) {
      ubic_service.waitingForResponse = false;
      ubic_service.recordString = "";
    }
  }

  robot.hear(/(.+)/, function(res) {
    if (that.active) {
      utils.debugSend(res, 'recording the string: ' + res.match[0]);
      ubic_service.recordString += res.match[0];
    }
  });

  robot.hear(/どうよ/i, function(res) {
    if (that.active) {
      ubic_service.initiateQuery(res);
    }
  });

  robot.hear(/activate/i, function(res) {
    that.setStatus(res, true)
  });

  robot.hear(/deactivate/i, function(res) {
    that.setStatus(res, false)
  });
}
