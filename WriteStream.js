let EventEmitter = require('events');
let fs = require('fs');

class WriteStream extends EventEmitter {
  constructor(path, options={}) {
    super();
    this.path = path; // 文件路径
    this.flags = options.flags || 'w'; // 文件写入的方式
    this.encoding = options.encoding || 'utf8';
    this.autoClose = options.autoClose || true; // 是否需要自动关闭
    this.mode = options.mode || 0o666; // 文件模式
    this.start = options.start || 0; // 开始写入的位置
    this.highWaterMark = options.highWaterMark || 16*1024; // 设置的
    this.fd = null; // 文件标识符，是number类型的
    this.needDrain = false; // 是否需要触发drain事件
    this.writing = false; // 是否正在写入，判断是否是第一次写入
    this.buffer = []; // 用数组模拟一个缓存 第二次之后的写入就放到缓存中（源码中用的是链表）
    this.len = 0;// 维护一个变量，计算当前缓存的长度
    this.pos = this.start; // 写入的时候也有位置关系
    this.open();
  }
  // chunk：写入的内容；encoding：编码格式；callback：写入完成后的回调
  write(chunk,encoding=this.encoding,callback){ // 写入的时候调用的方法
     // 为了统一，如果传递的是字符串也要转成buffer
    chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk,encoding);
    this.len += chunk.length; // 维护缓存的长度
    let ret = this.highWaterMark > this.len;
    if(!ret){ 
      this.needDrain = true; // 表示需要触发drain事件
    }
    if(this.writing){ // true表示正在写入,应该放在缓存中
      this.buffer.push({
        chunk,
        encoding,
        callback
      });
    }else{ // 第一次写入
      this.writing = true;
      this._write(chunk,encoding,()=>this.clearBuffer()); // 实现一个写入的方法
    }
    return ret; // write的返回值必须是true/false
  }
  _write(chunk,encoding,callback){ // 因为write方法是同步调用的，此时fd可能还没有获取到
    if(typeof this.fd !== 'number'){ // 判断如果文件还没有打开
      return this.once('open',()=>this._write(chunk,encoding,callback));
    }
    // 参数：fd 文件描述符； chunk是数据； 0：写入的buffer开始的位置； chunk.length写入的字节数； this.pos文件开始写入数据的位置的偏移量
    fs.write(this.fd,chunk,0,chunk.length,this.pos,(err,bytesWritten)=>{
      this.pos += bytesWritten;
      this.len -= bytesWritten; // 每次写入后，内存中的也要相应的减少
      callback();
    })
  }
  clearBuffer(){ // 清除缓存中的
    let buf = this.buffer.shift();
    if(buf){
      this._write(buf.chunk,buf.encoding,()=>this.clearBuffer());
    }else{
      if(this.needDrain){ // 如果需要触发drain
        this.writing = false;
        this.needDrain = false;// 触发一次drain 再置回false 方便下次继续判断
        this.emit('drain');
      }
    }
  }
  open(){ // 异步的打开文件
    fs.open(this.path,this.flags,this.mode,(err,fd)=>{
      if(err){
        this.emit('error'); // 发射'error'错误事件
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
    if(typeof this.fd === 'number'){ // 判断文件是否打开过
      fs.close(this.fd,()=>{
        this.emit('close');
      })
      return;
    }
    this.emit('close');
  }
}
module.exports = WriteStream;