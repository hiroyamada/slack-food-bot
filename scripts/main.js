var rp = require('request-promise');
var CronJob = require('cron').CronJob;
var ubic_service = require('./ubic_service.js');
var utils = require('./utils.js');

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

  //現在地
  that.currentLocation = null;

  //人数
  that.numPeople = null;

  //メンバー
  that.member = [];

  //目的
  that.purpose = [];

  setInterval(function() {
    if (ubic_service.waitingForResponse) {
      ubic_service.getResultsFromUBIC().then(function(payload) {
        switch (payload.result) {
          case 'success':
            ubic_service.latestRes.send('here are the results!');
            ubic_service.latestRes.send(payload.documents);
            ubic_service.waitingForResponse = false;
            break;
          case 'nowLearning':
            utils.debugSend(ubic_service.latestRes, 'ちょっと待ってね');
            break;
            ubic_service.latestRes.send('ERROR: ' + payload.result);
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
    
    utils.debugSend(res, 'recording the string: ' + res.match[0]);
    ubic_service.recordString += res.match[0];
  });

  robot.hear(/どうよ/i, function(res) {
    ubic_service.latestRes = res;
    if (ubic_service.waitingForResponse) {
      res.send('落ち着け');
      return;
    }
    res.send('ちょっとまってて');
    ubic_service.sendDataToUBICWithRetry(res).then(function() {
      ubic_service.registerTeacherWithRetry(res).then(function() {
        res.send('operation done!');
        ubic_service.waitingForResponse = true;
      });
    });
  });
}
