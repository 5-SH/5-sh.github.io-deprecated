---
layout: post
title: Node.js stream (4) Duplex, Transform, PassThrough 스트림  
date: 2022-04-27 18:00:00 + 0900
categories: Nodejs
ref: node.js stream
---

# 1. Duplex 스트림
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/165446769-bbe66198-e214-44cb-b139-cd9ad9f6945d.png" height="250" />
  <figcaption>▲ Duplex 스트림</figcaption>
</figure>
Duplex 스트림은 네트워크 소켓과 같이 데이터 소스 이면서 데이터 목적지인 엔티티이다.    
stream.Readable 과 stream.Writable 두 스트림의 함수를 상속한다.    
즉, Duplex 스트림으로 데이터를 read() 또는 write() 할 수 있고 read 및 drain 이벤트를 모두 수신할 수 있다.   

사용자 정의 Duplex 스트림을 생성하려면 _read(), _write() 함수 모두 구현을 제공해야 한다.    
Duplex 생성자에 전달되는 options 객체는 Readable 에서 다룬 options 와 동일하고 allowHalfOpen 이라는 새로운 옵션이 추가된다.   
allowHalfOpen 은 true 를 기본 값으로 가지고 false 로 설정하면 Readable 스트림이 끝날 떄 Writable 스트림을 자동으로 종료하며 반대의 경우도 마찬가지 이다.   

# 2. Transform 스트림
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/165446757-78aba061-5333-4a78-8bb7-17e94f5cbe17.png" height="250" />
  <figcaption>▲ Duplex 스트림</figcaption>
</figure>
데이터 변환을 처리하도록 설계된 특수한 종류의 Duplex 스트림이다.   
Duplex 스트림은 스트림에서 읽은 데이터와 스트림에 쓴 데이터 사이에 관계가 없다.   

반면에 Transform 스트림은 쓰기 가능한 쪽에서 받은 각 데이터 청크에 변환을 적용한 다음   
읽기 가능한 쪽에서 사용할 수 있또록 한다.   

## 2-1. Transform 스트림 구현
Transform 스트림을 구현하러면 _transform() 과 _flush() 를 제공해야 한다.

아래는 주어진 문자열의 모든 항목을 대체하는 Transform 스트림이다.    
데이터가 버퍼 모드가 아닌 스트리밍 될 때는 일치하는 문자열이 여러 청크에 분산되어 있을 수 있다.   

_transform() 함수는 리소스에 데이터를 쓰는 대신 __this.push()__ 함수를 사용해 내부 읽기 버퍼로 데이터를 넣는다.   
스트림이 종료될 때 내부 버퍼로 푸시되지 않은 일부 데이터가 있을 수 있다.   
_flush() 함수는 스트림이 종료되기 전에 호출되며, 남은 데이터를 푸시할 수 있는 마지막 기회이다.

```javascript
// replace-stream.js
const { Transform } = require('stream');

class ReplaceStream extends Transform {
  constructor(searchStr, replaceStr, options) {
    super({ ...options });
    this.searchStr = searchStr;
    this.replaceStr = replaceStr;
    this.tail = '';
  }

  _transform(chunk, encoding, callback) {
    const pieces = (this.tail + chunk).split(this.searchStr);
    const lastPiece = pieces[pieces.length - 1];
    const tailLen = this.searchStr.length - 1;
    this.tail = lastPiece.slice(-tailLen);
    pieces[pieces.length - 1] = lastPiece.slice(0, -tailLen);

    this.push(pieces.join(this.replaceStr));
    callback();
  }

  _flush(callback) {
    this.push(this.tail);
    callback();
  }
}

module.exports = {
  ReplaceStream
};
```

```javascript
// index.js
const { Transform } = require('stream');
const { ReplaceStream } = require('./replaceStream');

const replaceStream = new ReplaceStream('World', 'Node.js');
replaceStream.on('data', chunk => console.log(chunk.toString()));

replaceStream.write('Hello W');
replaceStream.write('orld!');
replaceStream.end();
```

## 3. PassThrough 스트림
PassThrough 는 변환을 적용하지않고 모든 데이터 청크를 출력하는 특수한 스트림이다.   
PassThrough 스트림은 관찰이 가능하고 느린 파이프 연결과 지연 스트림을 구현하는데 사용된다.   

### 3-1. 관찰
원하는 지점에서 PassThorugh 인스턴스를 파이프라인으로 연결해 스트림의 흐름을 관찰할 수 있다.

```javascript
const { createReadStream, createWriteStream } = require('fs');
const { PassThrough } = require('stream');
const { createGzip } = require('zlib');

let bytesWritten = 0;
const monitor = new PassThrough();
monitor.on('data', chunk => {
  bytesWritten += chunk.length;
});
monitor.on('finish', () => {
  console.log(`${bytesWritten} bytes written`);
});

// node .\passThrough.js .\sample\1GB.bin
const filename = process.argv[2];
createReadStream(filename)
  .pipe(createGzip())
  .pipe(monitor)
  .pipe(createWriteStream(`${filename}.gz`));
```

### 3-2. 느린 파이프 연결
스트림을 입력 매개 변수로 받아들이는 API 가 있을 떄,   
그 API 가 먼저 호출된 뒤 스트림이 데이터를 처리하기 시작한다면 API 의 구현이 복잡해질 수 있다.   
이 때, PassThorugh 를 사용해 느린 파이프 연결을 하면 쉽게 해결할 수 있다.   

스트림은 닫을 때 까지 완료된 것으로 간주하지 않기 때문에    
upload() 함수는 모든 데이터가 PassThrough 인스턴스를 통과할 떄까지 기다린다.

아래는 PassThrough 스트림을 느린 파이프로 사용한 코드이다.   
스트림으로 전달받은 데이터를 서버로 업로드 하는 upload API 를 호출 한 후    
전달할 데이터를 압축해 스트림으로 전달한다.

```javascript
// upload.js
const axios = require('axios');

function upload(filename, contentStream) {
  return axios.post(
    'http://localhost:3000',
    contentStream,
    {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Filename': filename
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    }
  );
}

module.exports = {
  upload
}
```

```javascript
const { createReadStream } = require('fs');
const { createBrotliCompress } = require('zlib');
const { PassThrough } = require('stream');
const { basename } = require('path');
const { upload } = require('./upload.js');

// node .\late-piping.js ..\sample\10GB.bin
const filepath = process.argv[2];
const filename = basename(filepath);
const contentStream = new PassThrough();

// API 먼저 호출
upload(`${filename}.br`, contentStream)
  .then(response => {
    console.log(`Server response: ${response.data}`)
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

// API 호출 후 스트림 처리
createReadStream(filepath)
  .pipe(createBrotliCompress())
  .pipe(contentStream);
```

### 3-3. 지연 스트림
동시에 다수의 파일 스트림을 생성해야 하는 경우 EMFILE 이라는 너무 많은 파일 열기 오류가 발생할 수 있다.   
createReadSteram() 과 같은 함수가 읽기 스트림을 생성할 때 마다 파일 디스크립터를 열기 때문이다.   
그리고 스트림 인스턴스를 만드는 것(파일 또는 소켓 열기, 데이터베이스 연결 초기화 등) 은 많은 비용이 드는 작업이다.   
이런 경우 비용이 많이 드는 스트림 인스턴스 초기화 작업을 실제로 스트림을 사용할 때 까지 지연시킬 수 있다.   


[npm lazystream](https://www.npmjs.com/package/lazystream) 과 같은 모듈은 실제 스트림 인스턴스에 대한    
프록시를 생성해 인스턴스가 즉시 초기화 되지 않게 한다.   
lazystream 은 PassThrough 스트림을 사용해 구현된다.