var rp = require('request-promise');
var CronJob = require('cron').CronJob;
var ubic_service = require('./ubic_service.js');
var utils = require('./utils.js');
var data_service = require('./data_service.js');
var place_service = require('./place_service.js');

module.exports = function(robot) {
  data_service.loadData();
  var that = this;
  that.send = robot.send;
  console.log('that.send'+that.send);


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
  that.isConfirmNumPeople = false

  //メンバー
  that.member = [];

  //目的
  that.purpose = [];
  that.places = ['地名','目白','めじろ','メジロ','渋谷','しぶや','シブヤ','品川','シナガワ','しながわ'];

  //yes
  that.yesComments = ['yes','はい','そう'];

  //no
  that.noComments = ['no','違う','ちがう'];

  //ubic_serviceを呼ぶか
  that.callUbicService = null;


  //アクティブかどうか
  that.active = false;

  //アクティブでかつ現在待ってる計算結果がある場合サーバーにリクエストを送信
  setInterval(function() {
    if (ubic_service.waitingForResponse && that.active) {
      ubic_service.getResultsFromUBIC().then(ubic_service.getNextResult);
    }

    if (that.active) {

    };
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
  	console.log('your id: ' + res.message.user.id);
  	// res.send('your id: ' + res.message.user.id);
  	if (!that.member.indexOf(res.message.user.id) < 1) {
  		that.member.push(res.message.user.id);
  		that.numPeople = that.member.length;
  		console.log('Add id: ' + res.message.user.id);
  		console.log('numPeople: ' + that.numPeople);
  		// res.send('Add id: ' + res.message.user.id);
  	};  	
    
    if (that.active) {
      utils.debugSend(res, 'recording the string: ' + res.match[0]);
      ubic_service.recordString += res.match[0];
    }
  });

  this.places.map(function(place){
  	robot.hear(place, function(res) {
      console.log(place + '駅周辺？');
      that.purpose.push(place)
      res.send(place + '駅周辺？');
  	});
  });

  this.noComments.map(function(comment){
  	robot.hear(comment, function(res) {
      console.log('そうか');
      res.send('そうだね');
  	});
  });

  this.yesComments.map(function(comment){
  	robot.hear(comment, function(res) {
      console.log('了解');
      res.send('了解');
      if (that.callUbicService) {
  	    ubic_service.initiateQuery(that.callUbicService);
  	    that.callUbicService = null;
  	  };
  	});
  });

  robot.hear(/ご飯行きたい|ごはんいきたい/i, function(res) {
    res.send('行こう!行こう！');
  });

  robot.hear(/行く|いく|いきたい|行きた/i, function(res) {
  	console.log('name: ' + res.message.user.name);
  	// console.dir(res);
  	res.send(res.message.user.name + 'なに食べたい？');
  });

  that.confirmNumPeople = function(send) {
  	that.isConfirmNumPeople = true;
  	console.log('人数は' + that.numPeople + 'でいい？');
  	send('人数は' + that.numPeople + 'でいい？');
  }

  robot.hear(/どうよ/i, function(res) {
  	console.log(that.isConfirmNumPeople);
  	if (that.isConfirmNumPeople) {
  	  if (that.active) {
        ubic_service.initiateQuery(res);
      }
  	}else{
  	  that.callUbicService = res;
  	  that.confirmNumPeople(res.send);
  	};
  });

  robot.hear(/[0-9]人/i, function(res) {
  	var result = res.match[0].match(/[0-9]/i);
  	that.numPeople = result;
  	console.log(res.match[0]);
  	if (that.callUbicService) {
  	  ubic_service.initiateQuery(that.callUbicService);
  	  that.callUbicService = null;
  	};
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
