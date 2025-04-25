---
layout: post
title: 스트림을 활용한 비동기 순차 처리
date: 2022-05-09 10:30:00 + 0900
categories: [patterns]
tags: [patterns, reactive programming, flow, flux]
---

# 스트림을 활용한 비동기 순차 처리

## 1. 순차적 실행
기본적으로 스트림은 데이터를 순서대로 처리합니다.    
Writable 스트림의 _write() 함수는 이전 호출이 callback() 을 호출해 완료될 때까지   
다음 데이터 청크를 가지고 호출되지 않습니다.   
그리고 Transform 스트림의 _transfrom() 함수 또한 이전 호출이 callback() 을 호출해 완료되어야   
다음 데이터 청크를 가지고 호출 됩니다.   

이것은 스트림의 중요한 속성으로 각 청크를 올바른 순서로 처리하는데 사용됩니다.    
이 속성을 활용해 스트림을 제어 흐픔 패턴에 사용할 수 있습니다.   

입력으로 받은 파일 목록을 순서대로 연결하는 concat-file.js 라는 새로운 모듈을 만들어 보겠습니다.

## 2. concat file 모듈
```javascript
//concat.js

const { concaFiles } = require('./concat-files.js');

async function main() {
  try {
    await concatFiles(process.ragv[2], process.argv.slice(3)); 
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  console.log('All files concatenated successfully');
}

main();
```

```javascript
// concat-files.js

const { createWriteStream, createReadStream } = require('fs');
const { Readable, Transform } = require('stream');

function concatFiles(dest, file) {
  return new Promise((resolve, reject) => {
    const destStream = createWriteStream(dest);
    Readable.from(files)                            // (1)
      .pipe(new Transform({
        objectMode: true,
        transform (filename, enc done) {            // (2)
          const src = createReadStream(filename);
          src.pipe(destStream, { end: false });
          src.on('error', done);
          src.on('end', done);                      // (3)
        }
      }))
      .on('error', reject)
      .on('finish', () => {                         // (4)
        destStream.end();
        resolve();
      });
  });
}

module.exports = concatFiles;
```

(1) 사용자가 요청한 파일 배열에서 Readable 스트림을 만듭니다.    
(2) 각 파일을 처리할 Transform 스트림을 만듭니다. 각 파일에 대해 Readble 스트림을 만들어   
파일 내용을 읽고 destStream 으로 파이프합니다. pipe() 옵션에 { end: false } 를 지정해   
파일 읽기를 완료된 후에도 destStream 을 닫지 않도록 합니다.   
(3) 소스 파일의 모든 내용이 destStream 으로 파이프되면 done() 함수를 호출해    
다음 파일의 처리를 시작합니다.    
(4) 모든 파일이 처리되면 작업을 종료합니다.

