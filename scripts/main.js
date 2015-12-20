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
      ubic_service.getResultsFromUBIC().then(ubic_service.getNextResult);
    }
  }, 5000);

  //60秒ごとに（アクティブであれば）いままでのチャット履歴をサーバーに送信
  setInterval(function() {
    if (that.active) {
      // TODO call the function with appropriate resposne object
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

  robot.hear(/おしえてれんな/i, function(res) {
    if (that.active) {
      ubic_service.initiateQuery(res);
    }
  });

  robot.hear(/他には/i, function(res) {
    if (that.active) {
      ubic_service.getNextResult();
    }
  });

  robot.hear("debugon", function(res) {
    utils.debugMode = true;
    res.send("debug mode on");
  });

  robot.hear("debugoff", function(res) {
    utils.debugMode = false;
    res.send("debug mode off");
  });

  robot.hear("storedebugon", function(res) {
    ubic_service.storeDebug = true;
    res.send("store debug mode on");
  });

  robot.hear("storedebugoff", function(res) {
    ubic_service.storeDebug = false;
    res.send("store debug mode off");
  });

  robot.hear("activate", function(res) {
    that.setStatus(res, true)
  });

  robot.hear("deactivate", function(res) {
    that.setStatus(res, false)
  });
}
