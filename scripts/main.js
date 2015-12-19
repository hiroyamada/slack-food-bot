module.exports = function(robot) {
  var sendDataToUBIC = function(dataToSend) {
    //現段階で抽出できたチャット内容(dataToSend)をUBICに送信。
  }

  var getResultsFromUBIC = function() {
    //UBICから結果を受信し、読みやすい形に変換してチャットで返信。
  }

  //チャット内容を記録。regexを要編集。
  robot.hear('regex', function(res) {

  });
}
