---
layout: post
title: Nodejs 에서 worker thread 사용법
date: 2021-06-18 21:00:00 + 0900
categories: Nodejs
ref: Nodejs, worker thread
---

# Nodejs 에서 worker thread 사용법

## Nodejs 와 싱글스레드
### 싱글스레드
Nodejs 의 자바스크립트 부분은 단일 스레드로 실행되고 나머지는 가상 머신과 운영체제가 병렬로 실행한다.   
IO 부분이 비동기로 이루어져 있다면 IO 이벤트가 발생할 때 까지 기다리지 않고 다른 자바스크립트 코드를 실행해 Nodejs가 빠르게 동작할 수 있다.   

### CPU Intensive 한 작업
큰 데이터를 메모리에 로드해 복잡한 계산을 하는 CPU Intensive 한 작업을 수행하면 나머지 자바스크립트 코드를 차단하는 동기 코드블록이 생기게 된다. 동기 코드 실행에 10초가 걸리게 되면 다른 요청이 10초 동안 차단된다.   
이런 문제를 해결하기 위해 Nodejs 에서 스레드를 만들고 동기화 해고 한다고 생각한다. 하지만 이 방법은 Nodejs의 비동기 싱글스레드 본질을 바꿔버리게 된다. Nodejs는 원자형이 아닌 타입의 엑세스 동기화 문제 같은 멀티스레딩 문제를 해결하기 어렵다.

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