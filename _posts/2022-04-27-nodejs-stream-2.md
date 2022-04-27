---
layout: post
title: Node.js stream (2) Readable 스트림  
date: 2022-04-27 18:00:00 + 0900
categories: Nodejs
ref: node.js stream
---

# Readable 스트림

## 1. 스트림 해부

스트림 코어 모듈은 네 가지 기본 추상 클래스를 제공한다.
> - Readbale
> - writable
> - Duplex
> - Transform

각 스트림 클래스는 EventEmitter 를 상속받으며, 스트림이 읽기를 마쳤을 때 'end', 쓰기를 완료했을 때 'finish', 오류가 발생 했을 때 'error' 와 같은 여러 이벤트를 생성한다.   
   
Node.js 의 스트림은 바이너리 데이터 뿐만 아니라 자바스크립트 의 객체도 처리할 수 있다.    
바이너리 모드는 버퍼 또는 문자열과 같은 청크 형태로 데이터를 스트리밍 하고   
객체 모드는 데이터를 일련의 개별 객체로 스트리밍 한다.   

## 2. Readable 
Readable 스트림 클래스는 non-flowing, flowing 두 가지 방법으로 데이터를 수신한다.   

### 2-1. non-flowing 모드
Readable 스트림에서 읽기를 위한 기본 패턴으로, 스트림에 읽을 수 있는 새로운 데이터가 생겼을 때 __readble__ 이벤트를 발생한다.    
readable 이벤트 리스너를 연결해 데이터 청크를 사용할 수 있으며, 이벤트 리스너 내 루프에서 read() 함수를 사용해 Readable 스트림의 내부 버퍼가 비워질 때 까지 데이터 청크를 계속 읽는다.   

아래는 표준 입력 stdin(Readable 스트림) 을 읽고 표준 출력으로 다시 에코하는 간단한 코드이다.
```javascript
process.stdin
  .on('readable', () => {
    let chunk;
    console.log('New data available');
    while ((chunk = process.stdin.read()) !== null) {
      console.log(
        `Chunk read(${chunk.length} bytes): "${chunk.toString().trim()}"`
      );
    }
  })
  .on('end', () => console.log('End of stream'));
```

read() 함수는 Readable 스트림 내부 버퍼에서 데이터 청크를 가져오는 동기 작업이다.   
스트림이 바이너리 모드에서 작동하는 경우 반환된 데이터 청크는 Buffer 객체이다.   
read() 함수는 내부 버퍼에 더 이상 사용 가능한 데이터가 없을 때 null 을 반환한다.   
read() 함수에 크기 값을 전달해 특정 양의 데이터를 읽도록 지정할 수 있다.   

### 2-2. flowing 모드   
flowing 모드를 사용하면 스트림이 읽은 새로운 데이터가 생겼을 때 내부 버퍼에 저장하고 read() 를 사용하여 가져오지 않고 'data' 이벤트 리스터로 바로 전달한다.   
flowing 모드는 non-flowing 모드에 비해 데이터 흐름을 제어하는 유연성이 떨어진다.   
flowing 모드를 활성화 하려면 __data__ 이벤트에 리스너를 연결하거나 resume() 함수를 명시적으로 호출한다.   
pause() 함수를 호출해 들어오는 데이터를 data 이벤트로 보내지 않고 내부 버퍼에 캐시할 수 있으며, pause() 함수를 호출하면 다시 스트림이 non-flowing 모드로 전환된다.   

```javascript
process.stdin
  on('data', chunk => {
    console.log('New data available');
    console.log(
        `Chunk read(${chunk.length} bytes): "${chunk.toString().trim()}"`
      );
  })
  .on('end', () => console.log('End of stream'));
```

### 2-3. Readable 스트림 구현
스트림 모듈에서 Readable 프로토타입을 상속해 새로운 클래스를 만들어야 한다.   
새로운 클래스는 _read() 함수의 구현을 제공해야 한다.   
Readable 클래스는 내부적으로 _read() 함수를 호출하고 _read() 함수는 push() 함수를 사용해 내부 버퍼를 채우기 시작한다.   
read() 는 스트림을 사용하는 클라이언트가 호출하는 함수이고   
_read() 함수는 스트림 내부에서 사용되는 함수이므로 직접 호출하면 안된다.   

아래는 무작위 문자열을 생성하는 스트림 코드이다.
Readable 객체에 options 객체를 통해 전달할 수 있는 매개변수는 아래와 같다.
> - 버퍼를 문자열로 변환하는데 사용되는 인코딩 인자(기본 값은 null)
> - 객체 모드를 활성하 하는 플래그(objectMode, 기본 값은 false)
> - 내부 버퍼에 저장된 데이터의 상한. 설정된 상한 이상의 데이터는 더 이상 읽깆 않아야 한다.(highWaterMark, 기본 값은 16KB)

```javascript
// random-stream.js
const { Readable } = require('stream');
const Chance = require('chance');

const chance = new Chance();

class RandomStream extends Readable {
  constructor(options) {
    super(options);
    this.emittedBytes = 0;
  }

  _read(size) {
    const chunk = chance.string({ length: size });
    this.push(chunk, 'utf-8');
    this.emittedBytes += chunk.length;
    if (chance.bool({ likelihood: 5 })) {
      this.push(null);
    }
  }
}

module.exports = {
  RandomStream,
};
```

```javascript
// index.js
const { Readable } = require('stream');
const { RandomStream } = require('./random-stream');
const Chance = require('chance');

const randomStream = new RandomStream();
randomStream
  .on('data', (chunk) => {
    console.log(`Chunk received (${chunk.length} bytes): ${chunk.toString()}`);
  })
  .on('end', () => {
    console.log(`Produced ${randomStream.emittedBytes} bytes of random data`);
  });
```
