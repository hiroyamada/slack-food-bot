var rp = require('request-promise');
var CronJob = require('cron').CronJob;
var ubic_service = require('./ubic_service.js');
var utils = require('./utils.js');
var data_service = require('./data_service.js');
var place_service = require('./place_service.js');

module.exports = function(robot) {
  data_service.loadData();
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

  //現在地
  that.currentLocation = null;

  //人数
  that.numPeople = null;

  //メンバー
  that.member = [];

  //目的
  that.purpose = [];
  that.places = ['地名','目白','めじろ','メジロ','渋谷','しぶや','シブヤ','品川','シナガワ','しながわ'];

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
  	console.log('your id: ' + res.message.user.id);
  	res.send('your id: ' + res.message.user.id);
  	if (!that.member.indexOf(res.message.user.id) < 1) {
  		that.member.push(res.message.user.id);
  		that.numPeople = that.member.length;
  		console.log('Add id: ' + res.message.user.id);
  		console.log('numPeople: ' + that.numPeople);
  		res.send('Add id: ' + res.message.user.id);
  	};  	
    
    if (that.active) {
      utils.debugSend(res, 'recording the string: ' + res.match[0]);
      ubic_service.recordString += res.match[0];
    }
  });

  this.places.map(function(place){
  	robot.hear(place, function(res) {
      console.log(res.match[0] + '駅周辺？');
  	});
  });

  robot.hear(/行く|いく|いきたい|行きた/i, function(res) {
  	console.log('name: ' + res.message.user.name);
  	console.dir(res);
  	res.send(res.message.user.name + 'なに食べたい？');
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
