---
layout: post
title: Node.js stream (1) 버퍼와 스트림  
date: 2022-04-27 18:00:00 + 0900
categories: Nodejs
ref: node.js stream
---

# 버퍼와 스트림
## 1. 버퍼링 대 스트리밍
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/165419761-102507ec-cce3-46b4-9865-6a0be77d08fb.png" height="450" />
  <figcaption>▲ 버퍼 모드</figcaption>
</figure>

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/165419764-c8a492c9-e205-4354-bf35-a664b241b5cd.png" height="450" />
  <figcaption>▲ 스트림 모드</figcaption>
</figure>

버퍼 모드는 리소스에서 들어오는 모든 데이터를 버퍼에 수집한다. 그런 다음 전체 버퍼를 소비하는 곳으로 전달한다.   
반면에 스트림은 리소스에서 데이터가 도착하자마자 데이터를 처리할 수 있다.   
스트림은 __공간(메모리 사용량)__ 과 __시간(계산 시간)__ 측면에서 더 효율적이다. 그리고 __결합성__ 이라는 중요한 특징을 가진다.   

## 2. 공간 효율성
수백 메가바이트 또는 기가바이트 정도의 매우 커다란 파일을 읽어야 하는 경우 버퍼 모드를 사용해   
파일을 읽는 것은 메모리가 부족해지는 문제가 발생할 수 있기 때문에 좋은 방법이 아니다.   
그리고 V8 의 버퍼 크기는 제한이 있다. 버퍼의 실제 최대 크기는 Node.js 버전에 따라 다르고 아래 코드로 확인할 수 있다.
```javascript
const buffer = require('buffer');
console.log(buffer.constants.MAX_LENGTH);
```

10GB 크기의 파일을 버퍼 모드로 읽어 GZIP 형식으로 압축하는 코드를 작성하면 아래와 같이   
파일 사이즈가 버퍼 최대 크기인 2GB 넘는다는 에러가 발생하게 된다.

```javascript
//gzip-buffer.js
const { promises: fs } = require('fs');
const { gzip } = require('zlib');
const { promisify } = require('util');

const gzipPromise = promisify(gzip);

const filename = process.argv[2];

// node .\gzip-buffer.js .\sample\1GB.bin
async function main() {
  const data = await fs.readFile(filename);
  const gzippedData = await gzipPromise(data);
  await fs.writeFile(`${filename}.gz`, gzippedData);
  console.log('File successfully compressed');
}
```

```
(node:10980) UnhandledPromiseRejectionWarning: RangeError [ERR_FS_FILE_TOO_LARGE]: File size (10485760000) is greater than 2 GB
    at readFileHandle (internal/fs/promises.js:297:11)
    at async main (C:\github\javascript\design-patterns-js\stream-coding\intro\gzip-buffer.js:11:16)
(Use `node --trace-warnings ...` to show where the warning was created)
...
```

버퍼 모드 대신 스트림 모드로 파일을 읽도록 코드를 작성하면 문제를 해결할 수 있다.   
스트림을 사용하면 모든 크기의 파일에 대해 일정한 메모리를 사용해 원활하게 실행된다.
```javascript
//gzip-stream.js
const { createReadStream, createWriteStream } = require('fs');
const { createGzip } = require('zlib');

const filename = process.argv[2];

// node .\gzip-stream.js .\sample\1GB.bin
createReadStream(filename)
  .pipe(createGzip())
  .pipe(createWriteStream(`${filename}.gz`))
  .on('finish', () => console.log('File successfully compressed'));
```

## 3. 시간 효율성
클라이언트가 파일을 압축해 원격 HTTP 서버에 업로드 한 다음, 서버에서 파일을 압축 해제하고 시스템에 저장하는 시스템이 있다고 가정한다.   
이 때 클라이언트가 버퍼링된 API 를 사용해 구현한 경우 전체 파일을 읽고 압축이 완료 되었을 때 업로드가 시작된다.   
그리고 압축 해제는 모든 데이터가 수신된 경우에 서버에서 시작된다.   
    
반면에 스트림을 사용하면 클라이언트는 파일을 읽은 즉시 데이터 청크를 압축하고 서버에 전송한다.    
그리고 서버는 수신하는 즉시 chunk 를 압축 해제할 수 있다.   

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/165425635-785c8463-0406-4d1b-90c8-92cc3dc6d9da.png" height="450" />
  <figcaption>▲ 버퍼링과 스트림 비교</figcaption>
</figure>

버퍼링된 API 를 사용하면 프로세스가 완전히 순차적이다.   
하지만 스트림을 사용하면 전체 파일을 읽을 때 까지 기다리지 않는다.    
그리고 다른 데이터 청크를 사용할 수 있을 때 이전 데이터 청크의 작업이 완료될 때 까지 기다릴 필요가 없다.   
실행하는 각 작업이 비동기적으로 동작하기 때문에 Node.js 에 의해 병렬화 될 수 있다.   
그리고 데이터 청크가 각 단계에 도착하는 순서를 유지해야 하는데, Node.js 스트림의 내부 구현이 이 순서를 유지해 준다.   
