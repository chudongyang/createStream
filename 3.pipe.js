// pipe方法 叫管道  ，可以控制速率
let fs = require('fs');
// let rs = fs.createReadStream('a.txt', { 
//   highWaterMark: 4
// });
// let ws = fs.createWriteStream('b.txt', { 
//   highWaterMark: 1
// });
let ReadStream = require('./ReadStream');
let WriteStream = require('./WriteStream');
let rs = new ReadStream('a.txt', { 
  highWaterMark: 4
});
let ws = new WriteStream('b.txt', { 
  highWaterMark: 1
});
// 会监听rs的on('data')方法，将读取到的内容调用ws.write方法
// 调用写的方法会返回一个boolean类型，如果返回false会调用rs.pause()暂停读取，等待可写流写入完毕后，调用ws.on('drain')在恢复读取，因此pipe方法可以控制速率（防止淹没可用内存）
rs.pipe(ws);