let fs = require('fs');
let WriteStream = require('./WriteStream');

let ws = new WriteStream('a.txt',{
  flags: 'w',
  mode: 0o666,
  encoding: 'utf8',
  autoClose: true,
  start: 0,
  highWaterMark: 3
})
let i = 0;
// 写入时只占用三个字节的内存
function write(){ // 每次写三个，然后停住，写入完成后再开始写
  let flag = true;
  while(i < 9 && flag){
    flag = ws.write(i + '');
    i++
  }
}
ws.on('drain',function(){ // 达到highWaterMark触发该事件
  console.log('写入成功');
  write();
})
write();