let fs = require('fs');
let ReadStream = require('./ReadStream');
// 这里可以new ReadStream 换成原生的 fs.createReadStream比较一下效果
let rs = new ReadStream('a.txt', { 
  flags: 'r', 
  encoding: 'utf8', 
  autoClose: true,
  mode: 0o666,
  start: 0, 
  end:5,
  highWaterMark: 2 
})
rs.on('open',function () {
  console.log('open')
});
rs.on('error',function (err) {
  console.log(err);
});
rs.on('data',function (data) {
  console.log(data);
  rs.pause();
});
rs.on('end',function () {
  console.log('完毕')
})
rs.on('close',function () {
  console.log('close');
})
setInterval(() => {
  rs.resume();
}, 1000);