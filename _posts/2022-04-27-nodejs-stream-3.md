---
layout: post
title: Node.js stream (3) Writable 스트림  
date: 2022-04-27 18:00:00 + 0900
categories: Nodejs
ref: node.js stream
---
# Writable 스트림

## Writable
Writable 스트림은 파일 시스템의 파일, 소켓, 표준 출력 인터페이스 등 대상 데이터의 목적지를 나타낸다.   
write 함수를 통해 Writable 스트림으로 데이터를 전달할 수 있다.   

> writable.write(chunk, [encoding], [callback])   

인코딩 인자는 선택 사항이며 청크가 문자열인 경우 지정할 수 있다.    
기본 값은 utf-8 이고 청크가 Buffer 인 경우 무시된다.   

callback 함수는 청크가 리소스로 플러시 될 때 호출되며 선택사항이다.   
callback 함수를 write 함수 인자로 사용하면 flush 될 때 호출해야 다음 write 요청을 처리할 수 있다.   

스트림에 기록할 데이터가 없다는 신호를 보내려면 end() 함수를 호출한다.   
end() 함수를 통해 최종 데이터 청크를 제공할 수 있다.    
end() 의 콜백 함수는 스트림에 기록된 모든 데이터가 플러시 될 때 실행되는 리스너를 finish 이벤트에 등록하는 것과 같다.

### 1. 배압
스트림은 소비할 수 있는 것 보다 빨리 데이터가 기록되는 경우 병목 현상이 생길 수 있다.   
이 문제를 해결하기 위해 들어오는 데이터를 버퍼링 한다. 그러나 내부 버퍼에 많은 데이터가 쌓여 원하지않는 수준의 메모리 사용량이 발생하는 상황이 생길 수 있다.   

이를 방지하기 위해 writable.write() 는 내부 버퍼가 highWaterMark 제한을 초과하면 false 를 반환한다.   
그리고 내부 버퍼가 비워지면 drain 이벤트가 발생해 다시 쓰기를 시작할 수 있다고 이벤트를 보낸다.    
이러한 매커니즘을 배압이라고 한다.   

배압은 권고 메커니즘으로 write() 가 false 를 반환해도 무시하고 계속 쓸 수 있어 버퍼가 무한정 커질 수 있다.   
highWaterMark 임계값에 도달한다고 스트림이 자동으로 차단되지 않는다.   

Readable 스트림에도 배압이 적용된다.   
_read() 내부에서 호출되는 push() 함수가 false 를 반환할 때 트리거 된다.


### 2. Writable 스트림 구현
Writable 클래스를 상속하고 _write() 함수를 구현해 새로운 Writable 스트림을 만들 수 있다.

아래는 파일에 데이터를 쓰는 스트림 코드이다. 파일명과 파일에 쓸 내용을 객체로 받기 때문에 객체 모드로 동작한다.   

```javascript
// writable-stream.js
const { Writable } = require('stream');
const { promises: fs } = require('fs');
const { dirname } = require('path');
const mkdirp = require('mkdirp');

class ToFileStream extends Writable {
  constructor(options) {
    super({ ...options, objectMode: true });
  }

  _write(chunk, encoding, cb) {
    mkdirp(dirname(chunk.path))
      .then(() => fs.writeFile(chunk.path, chunk.content))
      .then(() => cb())
      .catch(cb);
  }
}

module.exports = {
  ToFileStream
};
```

```javascript
// index.js
const { Writable } = require('stream');
const { promises: fs } = require('fs');
const { ToFileStream } = require('./writable-stream');
const { dirname, join } = require('path');
const mkdirp = require('mkdirp');

const toFileStream = new ToFileStream();

toFileStream.write({
  path: join('files', 'file1.txt'), content: 'Hello'
});

toFileStream.write({
  path: join('files', 'file2.txt'), content: 'Node.js'
});

toFileStream.write({
  path: join('files', 'file3.txt'), content: 'streams'
});

toFileStream.end(() => console.log('All files created'));
```
