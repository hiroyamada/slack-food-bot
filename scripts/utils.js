exports.debugMode = true;

exports.debugSend = function(res, string) {
  console.log("debug send");
  console.log(string);
  if (exports.debugMode) {
    res.send(string);
  }
  console.log("exit");
};
