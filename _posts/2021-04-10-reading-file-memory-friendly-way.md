---
layout: post
title: Node.js 에서 메모리를 효과적으로 사용해 파일을 읽는 방법
date: 2021-04-12 23:30:00 + 0900
categories: Nodejs
ref: node.js, stearm, file
---

출처 : https://betterprogramming.pub/a-memory-friendly-way-of-reading-files-in-node-js-a45ad0cc7bb6

# Node.js 에서 메모리를 효과적으로 사용해 파일을 읽는 방법
파일을 읽는 대표적인 방법 세가지   
- fs.readFile, fs.readFileSync 빌트인 함수 사용
- fs.createReadSteram 스트림을 활용해 읽어오기
- fs.read 빌트인 함수와 shared buffer 를 활용해 file read 함수를 만들어 읽어오기

## 1. 배경
  세 가지 파일 read 코드를 사용해 1GB 의 파일을 10MB chunk 로 읽어 처리하는 node.js 어플리케이션을 실행한다.
  10MB 크기는 utf-8 인코딩 기준 10,000,000 문자를 저장할 수 있다. 이는 보통 로그, csv 파일의 한 줄의 크기 보다 훨씬 크다.
  아래는 각 방법으로 파일을 읽었을때 어플리케이션에서 사용하는 메모리의 크기이다.
  
  ![Screenshot_20210412-224819_Samsung Internet](https://user-images.githubusercontent.com/13375810/114417307-73a96300-9bec-11eb-9b4b-2e281cfabf71.jpg)

  readFileSync 함수를 활용하면 파일 사이즈 이상의 메모리를 사용하고 createReadStream 을 활용하면 20~90MB 메모리를 사용한다.   
  fs.read 함수와 shared buffer 를 활용한 file read 함수를 사용할 때 가장 효과적인데, 10~20MB 정도의 메모리를 사용한다.
  
## 2. readFileSync
```javascript
const CHUNK_SIZE = 10000000;
const data = fs.readFileSync('./file');
for (let bytesRead = 0; bytesRead < data.length; bytesRead = bytesRead + CHUNK_SIZE) {
  // do something with data
}
```

  파일에서 읽은 데이터는 'data' 변수에 저장되기 때문에 메모리에서 1GB 이상을 사용하는 것이 당연하다.   
  큰 파일을 다룰때는 불리하지만 파일의 모든 부분에 접근할 수 있기 때문에 작은 파일을 다룰 때는 유리하다.   
  
## 3. createReadStream
```javascript
const CHUNK_SIZE=10000000;
async function start() {
  const  stream = fs.createReadStream('./file', { highWaterMark: CHUNK_SIZE });
  for await(const data of stream) {
    // do someting with data
  }
}
```

  파일 data 대신 stream 을 리턴한다. stream 은 실제 파일 data 에 접근하기 위해 추가적인 for-await 반복 작업이 필요하다.   
  highWaterMark 옵션은 파일을 매번 읽어올 때 옵션으로 지정된 만큼만 읽어 오도록 설정한다.   
  이미 읽은 chunk 는 GC 에서 정리하기 전까지 메모리에 남아있기 때문에 최대 90MB 정도를 메모리로 사용한다.
  
## 4. Read Shared buffer
  이 어플리케이션은 세 가지로 구성되어 있다.
  - Promise 로 감싼 fs.read
  - async generator
  - data 를 처리하기 위한 메인 loop

  모든 함수에서 새 버퍼를 생성하는 대신 shared buffer 를 refence 로 전달한다. 이를 통해 메모리 사용량을 줄일  수 있다.

```javascript
function readBytes(fd, sharedBuffer) {
  return new Promise((resolve, reject) => {
    fs.read(
      fd,  // file descriptor
      sharedBuffer,  // data 를 쓸 버퍼
      0,   // 버퍼에 data 를 쓸 시작점
      shardBuffer.length,  // 파일을 읽을 크기, CHUNK_SIZE 만큼 읽을 것
      null,  // 파일을 읽을 시작점. null 로 설정하면 첫 번째 byte 부터 시작해 자동으로 위치를 update 하며 읽는다.
      err => {
        if (err) return reject(err);
        resolve();
      }
  });
}

async function* generateChunks(filePath, size) {
  const shadBuffer = Buffer.alloc(size);
  const stats = fs.statSync(filePath);
  const fd = fs.openSync(filePath);
  let bytesRead = 0;  // how many bytes were read
  let end = size;
  
  for (let i = 0; i < Math.ceil(stats.size / size); i++) {
    await readBytes(fd, shaerdBuffer);
    bytesRead = (i + 1) * size;
    if (bytesRead > stats.size) {
      // When we reach the end of file,
      // we have to calculate how many bytes were actually read
      end = size - (bytesRead - stats.size);
    }
    
    yeild sharedBuffer.slice(0, end);
  }
}

const CHUNK_SIZE = 10000000;
async function main() {
  for await(const chunk of generateChunks('./file', CHUNK_SIZE)) {
    // do something with data
  }
}
```
