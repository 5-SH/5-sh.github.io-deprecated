---
layout: post
title: Node.js stream
date: 2021-04-09 20:23:55 + 0900
categories: [nodejs]
tags: [nodejs stream]
---
출처:https://jeonghwan-kim.github.io/node/2017/07/03/node-stream-you-need-to-know.html   
https://jeonghwan-kim.github.io/node/2017/08/07/node-stream-you-need-to-know-2.html   
https://jeonghwan-kim.github.io/node/2017/08/12/node-stream-you-need-to-know-3.html   

#  Node.js 스트림
  스트림은 배열이나 문자열 같은 데이터 컬렉션이다. 한 번에 모든 데이터를 읽은 수 없지만   
  외부 소스에서 data 를 한 번에 한 chunk 씩 읽어와 큰 데이터를 다룰 때 유리하다.
  
  - Stream 인터페이스를 구현한 노드의 내장 모듈   
    Readable Streams : HttpResponse(client) , HttpRequest(server), fs read stream, TCP socket, child process stdout / std err, process stdin   
    Writable Streams : HttpResponse(server), HttpRequest(client), fs write stream, TCP socket, child process stdin, process stdout / stderr
    
## 1. 스트림의 실제 예제
  fs 모듈은 Stream 인터페이스로 파일을 읽고 쓰는데 사용할 수 있다. 아래는 400MB 정도의 파일을 
  스트림으로 생성해 읽는 예제이다.

```javascript
const fs = require("fs");
const file = fs.createWriteStream("./big.file");
for (let i = 0; i < 1e6; i++) {
  file.write( `Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
   tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
   nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis 
   aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat 
   nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui 
   officia deserunt mollit anim id est laborum.\n` );
  }
}

file.end()

const server = require("http").createServer();

server.on("request", (req, res) => {
  fs.readFile('./big.file", (err, data) => {
    if (err) throw err;
    res.end(data);
  });
});

server.listen(8000);
```

  스트림 없이 버퍼를 통해 fs.readFile 할 경우 메모리가 파일을 크기 만큼 증가한다.   
  HttpResponse(res) 객체는 스트림 쓰기 가능한 객체로 big.file 을 읽는 스트림을 만들어   
  pipe() 로 이어주면 메모리를 400MB 쓰지 않고 전달할 수 있다.   
  fs 모듈은 어떤 파일에 대해서도 createReadStream 메소드를 이용하면 읽기 가능한 스트림을 제공한다.
  
```javascript
const fs = require('fs');
const server = require('http').createServer();

server.on('request', (req, res) => {
  const src = fs.createReadStream('./big.file');
  src.pipe(res);
});

server.listen(8000);
```

  스트림을 통해 파일을 읽을 경우 메모리를 25MB 정도만 사용한다.   
  만약 2GB 크기의 파일을 읽는 경우 노드의 기본 버퍼 한계치보다 큰 사이즈가 되어   
  버퍼 한계치를 변경하지 않고는 fs.readFile 로 파일을 읽을 수 없다.   
  하지만 fs.createReadStream 을 사용하면 요청자엑 2GB 데이터를 스트리밍 할 수 있다.


## 2. 스트림 타입
  Node.js 스트림에느 4가지 타입이 있다.
  - readable stream
  - writable stream
  - duplex stream : 읽기/쓰기 모두 가능한 스트림. ex) TCP socket
  - transform stream : 기본적으로 duplex stream. 데이터를 읽거나 기록할 때 수정/변환할 수 있다.
 
## 3. pipe 메소드
  readable stream 과 writable stream 을 pipe() 로 연결해 사용할 수 있다. 중간에 duplex stream 을   
  사용하면 파이프 체인을 만들 수 있다.

```javascript
readableSrc.pipe(transformStream1).pipe(transforStream2).pipe(finalWritableDest)
```

## 4. 스트림 이벤트
  스트림에서 사용하는 이벤트는 다음과 같다.   
  ___readable___
  - data : 스트림이 소비자에게 데이터 청크를 전송할 때 발생
  - end : 더 이상 소비할 데이터가 없을때 발생
     
  ___writable___
  - drain : 쓰기 가능한 스트림이 더 많은 데이터를 수신할 수 있다는 신호
  - finish : 모든 데이터가 시스템으로 플러시 될 때 생성
     
  ___일시정지 / 흐름 모드___   
  - 기본적으로 readable stream 은 일시정지 모드에서 시작한다.   
  - 필요에 따라 흐름 모드로 변경되거나 일시정지 모드로 돌아갈 수 있다.    
  - readable stream 이 일시정지 모드일 때 read() 메소드를 호출 스트림을 읽을 수 있다.   
  - 하지만 흐름 모드일 경우 데이터가 연속적으로 흐르고 있기 때문에 기다려야 한다.   
  - 흐름 모드일 때 데이터를 수신할 사용자가 없으면 사라진다.   
  - 따라서 흐름 모드에서 읽을 스트림이 있을 경우 data 이벤트 핸들러가 필요하다.   
  - 수동으로 두 모드를 변경하려면 resume(), pause() 메소드를 사용한다.
  - pipe 메소드를 사용하는 경우 pipe 가 자동으로 관리하기 때문에 두 모드를 신경쓰지 않아도 된다.

 ```javascript 
readable.on('data', chunk => writable.write(chunk));
readable.on("end", () => writable.end());
```

## 5. 스트림 구현
#### 1. 쓰기 스트림 구현
```javascript
const { Writable } = require('stream');

// Writable 상속
class myWritableStream extends Writable { ... }

// Writable 생성자로 객체 생성
// 데이터 청크를 보내기 위한 write 함수 필수 옵션
const outStream = new Writable({
  write(chunk, encoding, callback) {
    console.log(chunk.toString());
    callback();
  },
});

process.stdin.pipe(outStream);
```
  write 메소드는 세 개의 인자가 필요하다.
  - chunk : 보통 버퍼
  - encoding : 인코딩 타입, 보통 무시할 수 있음
  - callback : 데이터 청크를 처리한 뒤 호출되는 함수

#### 2. 읽기 스트림 구현
```javascript
const { Readable } = require('stream');
const inSteram = new Readable({ });

inStream.push('ABCDEFGHIJKLM');
inStream.push('NOPQRSTUVWXYZ');
inSteram.push(null); // 더 이상 데이터 없음

inStream.pipe(process.stdout);
```

  read stream 옵션에 read() 메소드를 구현하면 요청이 있을 때 데이터를 push 할 수 있다.   
  읽기 스트림을 읽는 동안 read 메소드는 계속 실행되고 A~Z 까지 문자를 push 한다.   
  Z 까지 push 하고 나면 null 을 push 해 끝났음을 알린다.
  
```javascript
const inStream = new Readable( {
  read(size) {
    this.push(String.fromCharCode(this.currentCharCode++))
    if (this.currentCharCode > 90) this.push(null)
  }
});
```
#### 3. Duplex 스트림 구현
  duplex stream 을 사용하면 한 객체로 읽기/쓰기 가능한 스트림을 만들 수 있다.   
  읽기/쓰기는 서로 독립적이고 두 기능을 하나의 객체로 그룹핑한 것이다.   
```javascript
const { Duplex } = require("stream");
const inoutStream = new Duplex({ 
  write(chunk, encoding, callback) { 
    console.log(chunk.toString());
    callback(); 
  }, 
  read(size) { 
    this.push(String.fromCharCode(this.currentCharCode++));
    if (this.currentCharCode > 90) { 
      this.push(null);
    } 
  }, 
}) 

inoutStream.currentCharCode = 65;
process.stdin.pipe(inoutStream).pipe(process.stdout);
```

#### 4. Steram Objct 모드
  기본적으로 스트림은 버퍼와 문자열을 기대한다. objectMode 플래그를 사용하면 js Object 를 허용할 수 있다.   
  아래 예제는 ',' 로 구분된 문자열을 js object 로 매핑하는 동작을 한다.   
  "a,b,c,d" 문자열은 {a:b, c:d} 가 된다.
```javascript
const { Transform } = require('stream');

const commaSplitter = new Transform({
  readableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().trim().split(',');
    callback();
  }
});

const arrayToObject = new Transform({
  readableObjectMode: true,
  writableObjectMode: true,
  
  transform(chunk, encoding, callback) {
    const obj = {};
    for (let i = 0; i < chunk.length; i += 2) {
      obj[chunk[i]] = chunk[i + 1];
    }
    this.push(obj);
    callback();
  }  
});

const objectToString = new Transform({
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(JSON.stringify(chunk) + '\n');
    callback();
  }
});

process.stdin.pipe(commaSplitter).pipe(arrayToObject).pipe(objectToString).pipe(process.stdout);
  
  

```
