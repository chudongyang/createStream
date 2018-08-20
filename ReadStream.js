let EventEmitter = require('events');
let fs = require('fs');

class ReadStream extends EventEmitter{
  constructor(path,options){
    super();
    this.path = path;
    this.flags = options.flags || 'r';
    this.encoding = options.encoding || null;
    this.autoClose = options.autoClose || true;
    this.mode = options.mode || 0o666;
    this.start = options.start || 0;
    this.end = options.end || null;
    this.highWaterMark = options.highWaterMark || 64*1024;
    this.fd = null; // 文件标识符
    this.pos = this.start; // 记录文件读取的位置，默认和开始读取的位置相等
    this.flowing = null; // 记录当前是否是流动模式
    this.buffer = Buffer.alloc(this.highWaterMark); // 构建读取后存放内容的buffer
    this.open(); // 当创建可读流 要将文件打开
    this.on('newListener',(type)=>{ // 绑定 'newListener'事件，监听是否绑定了 'data'事件
      if(type === 'data'){
        this.flowing = true;
        this.read(); // 开始读文件
      }
    })
  }
  read(){ // 读取文件
    if (this.finished) { // 读完之后就不再读了
      return;
    }
    // open打开文件是异步的，当我们读取的时候可能文件还没有打开
    if(typeof this.fd !== 'number'){
      this.once('open',()=>this.read());
      return;
    }
    // length代表每次读取的字节数 如果this.end = 4;说明要读取5个字节，this.highWaterMark= 3；说明每次读取3个，第一次读完后this.pos = 3;此时还需要在读取2个字节就够了
    let length = this.end ? Math.min(this.highWaterMark, this.end - this.pos + 1) : this.highWaterMark;
    //参数： 文件标识符， 数据将被写入到的buffer，buffer中开始写入的位置， 要读取的字节数， 从文件中开始读取的位置
    fs.read(this.fd,this.buffer,0,length,this.pos,(err,bytesRead)=>{
      if(err){
        this.emit('error',err);
        this.destroy();
        return;
      }
      if(bytesRead > 0){ // 读到的字节数 
        this.pos += bytesRead;
        let res = this.buffer.slice(0, bytesRead); // 真实读取到的bytesRead可能不能填满this.buffer，需要截取,保留有用的
        res = this.encoding ? res.toString(this.encoding) : res;
        this.emit('data', res);
        if (this.flowing) { // 如果是流动模式，就继续调用read方法读取
          this.read();
        }
      }else {
        this.finished = true; // 读完的标识
        this.emit('end');
        this.destroy();
      }
    })
  }
  open(){ // 异步地打开文件
    fs.open(this.path,this.flags,this.mode,(err,fd)=>{
      if(err){
        this.emit('error',err); // 发射'error'错误事件
        if(this.autoClose){ // 如果autoClose为true，就要关闭文件
          this.destroy();
        }
        return;
      }
      this.fd = fd; // 保存文件标识符
      this.emit('open'); // 发射'open'打开事件
    })
  }
  destroy(){ // 关闭文件的操作
    if(typeof this.fd === 'number'){
      fs.close(this.fd,(err)=>{
        if(err){
          this.emit('error',err);
          return;
        }
        this.emit('close'); // 发射'close'关闭文件事件
      })
      return;
    }
    this.emit('close');
  }
  pause(){ // 暂停监听 'data' 事件
    this.flowing = false;
  }
  resume(){ // 开始监听 'data' 事件
    this.flowing = true;
    this.read();
  }
  pipe(dest){
    this.on('data',(data)=>{
      let flag = dest.write(data);
      if(!flag){
        this.pause(); // 不能继续读取了，等写入完成后再继续读取
      }
    });
    dest.on('drain',()=>{
      this.resume();
    })
  }
}

module.exports = ReadStream;