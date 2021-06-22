---
layout: post
title: Nodejs 에서 worker thread 사용법
date: 2021-06-23 02:00:00 + 0900
categories: Nodejs
ref: Nodejs, worker thread
---

# Nodejs 에서 worker thread 사용법

## Nodejs 와 싱글스레드
### 싱글스레드
Nodejs 의 자바스크립트 부분은 단일 스레드로 실행되고 I/O는 가상 머신과 운영체제가 병렬로 실행한다.      
Node.js 가 시작되면 하나의 프로세스, 하나의 스레드, 하나의 이벤트 루프, 하나의 js 엔진 인스턴스, 하나의 노드js 인스턴스가 실행된다.   
- 하나의 프로세스 : 어디서든 접근가능한 전역 객체이자 실행되고 있는 것들의 정보를 가지고 있는 프로세스   
- 하나의 스레드 : 단일 스레드는 주어진 프로세스에서 한 번에 하나의 명령만이 실행된다.(동시성 문제가 발생하지 않는다.)
- 하나의 이벤트 루프 : callback, promise, async/await 를 통해 시스템 커널에 작업을 offload 하게 한다. 이를 통해 노드가 비동기식, 논블로킹 I/O 특성을 가지게 된다.   
- 하나의 js 엔진 인스턴스 : js 코드를 실행하는 컴퓨터 프로그램(v8 엔진)
- 하나의 Nodejs 인스턴스 : Nodejs 코드를 실행하는 컴퓨터 프로그램(libuv)   

Node.js 는 싱글스레드에서 실행되고 이벤트루프 에서는 한 번에 하나의 작업만 발생한다. 한 번에 하나의 코드가 실행되기 때문에(코드는 병렬로 실행되지 않음) 동시성 문제 걱정 없이 자바스크립트를 사용할 수 있다.

### CPU Intensive 한 작업
큰 데이터를 메모리에 로드해 복잡한 계산을 하는 CPU Intensive 한 작업을 수행하면 나머지 자바스크립트 코드를 차단하는 동기 코드블록이 생기게 된다. 동기 코드 실행에 10초가 걸리게 되면 다른 요청이 10초 동안 차단된다.
<br/>   
그리고 CPU Intensive 한 코드가 이벤트루프를 차단해 다른 요청들이 처리되지 않게 할 수도 있다. 메인 이벤트루프가 특정 함수가 끝날 때까지 기다려야 하는 경우 blocking 함수로 간주한다. non blocking 함수는 메인 이벤트루프가 시작되는 즉시 진행되고 메인 루프가 완료되면 callback 을 호출한다.      
<br/>
이런 문제를 해결하기 위해 Nodejs 에서 스레드를 만들고 동기화해야 한다고 생각한다. 하지만 이 방법은 Nodejs의 비동기 싱글스레드 본질을 바꿔버리게 된다. Nodejs는 원자형이 아닌 타입의 엑세스 동기화 문제 같은 멀티스레딩 문제를 해결하기 어렵다.

### 해결법1
CPU Intensive 한 작업 중간에 다른 이벤트 처리를 할 수 있도록 작업을 chunk 로 나누고 setImmediate 로 실행한다.

```javascript
const arr = [
  // 큰 배열
];
for (const item of arr) {
  // CPU Intensive 한 작업
}
```
chunk 로 나눠서 실행하면.
```javascript
const arr = new Array(20000).fill('something');
function processChunk() {
  if (arr.length === 0) {
    // 모든 배열이 실행이 끝난 뒤 실행됨
  } else {
    const subarr = ar.splice(0, 10);
    for (const item of subarr) {
      // CPU Intensive 한 작업을 나누어 실행
    }

    // 다음 이벤트 루프로 작업을 밀어넣음
    setImmediate(processChunk);
  }
}
```
setImmediate(callback) 이 실행될 때 마다 10개씩 작업을 처리하고, 다른 작업이 생기면 이 작업 사이에 처리하게 된다.

### 해결법2
setImmediate() 를 사용하는 방법은 간단한 시나리오에서만 쓸만하다. 프로세스를 fork 해 백그라운드 처리하고 메세지를 전달하는 방식으로 구현 가능하다. 프로세스 fork 이므로 메모리는 공유될 수 없고 데이터는 모두 복제된 데이터이다. 한쪽에서 데이터를 변경하면 다른 쪽에서 변경이 일어나지 않는다.   
프로세스를 만드는 것은 많은 리소스가 들고 메모리를 공유하지 않기 때문에 좋은 방법이 아니다. 그리고 fork 된 프로세스는 한 번에 하나의 작업만 처리할 ㅅ 있다. 10초가 걸리는 작업과 1초가 걸리는 작업이 순서대로 있는 경우, 10초 동안 작업을 먼저 처리한 후 1초 걸리는 작업을 수행하게 된다.   
프로세스 fork 를 사용하기 위해서 프로세스 풀이 필요하다. 각 프로세스마다 한 번에 작업을 수행하고 작업이 완료 된 후 프로세스를 반환한다. 반환된 프로세스는 다시 사용된다. worker-farm 모듈을 사용해 프로세스 풀을 사용할 수 있다.   

### 해결법3
스레드는 프로세스 포크에 비해 리소스가 적게 필요하기 때문에 더 나은 해결방법이 될 수 있다. Worker Thread 를 사용하면 메인프로세스와 메세지 패싱으로 정보를 교환하기 때문에 레이스 컨디션 문제를 해결할 수 있다.그리고 같은 프로세스에 존재하기 때문에 메모리를 적게 사용하고 메모리 공유도 가능하다.   
많은 양의 데이터를 활용해 CPU Intensive 한 작업을 수행할 때 적절하게 사용될 수 있다.    
<br/>
worker_thread 모듈을 사용하면 자바스크립트를 병렬로 실행하는 스레드를 사용할 수 있다.
- 하나의 프로세스
- 여러 개의 스레드
- 스레드 별 하나의 이벤트루프
- 스레드 별 하나의 js 엔진 인스턴스
- 스레드 별 하나의 Nodejs 인스턴스
![worker-diagram_2x__1_](https://user-images.githubusercontent.com/13375810/122965246-f4da5e80-d3c2-11eb-9056-db39de37e13b.jpg)

## Worker Thread 예제
노드 10 버전 부터 worker_thread 를 사용할 수 있고 11.7 버전 이하에서는 --experimental-worker 옵션을 추가해야 사용할 수 있다.   

```javascript
// index.js
const { Worker } = require('worker_threads');

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./service.js', { workerData });
  });
  worker.on('message', resolve);
  worker.on('error', reject);
  worker.on('exit', code => {
    if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
  });
}

async function run() {
  const result = await runService('world');
  console.log(result);)
}

run().catch(err => console.error(err));

// service.js
const { workerData, parentPort } = require('worker_threads');

// 여기서 CPU Intensive 한 작업을 동기로 메인스레드를 방해하지 않으며 처리할 수 있다.
parentPort.postMessage({ hello: workerData });
```

### worker thread 를 특별하게 만드는 이유
- ArrayBuffers : 한 스레드에서 다른 스레드로 메모리를 전송하는 방법
- SharedArrayBuffer : 어떤 스레드에서도 접근할 수 있다. 스레드 간에 메모리를 공유할 수 있게 해준다.(공유하는 데이터 형식은 이진 데이터로 제한)
- MessagePort : 서로다른 스레드 간의 통신을 위해 사용.
- MessageControl : 서로 다른 스레드 간의 통신에 사용되는 비동기식 양방향 통신 채널
- WorkerData : startup 데이터를 전달하기 위해 사용. postMessage() 를 사용하는 것처럼 데이터가 복제됨.
