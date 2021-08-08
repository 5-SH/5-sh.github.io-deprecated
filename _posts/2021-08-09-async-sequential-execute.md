---
layout: post
title: 자바스크립트의 비동기 순차 실행
date: 2021-08-09 03:00:00 + 0900
categories: Javascript
ref: Javascript, async, sequential
---

# 자바스크립트의 비동기 순차 실행
실행 순서에 따라 한 번에 하나씩 비동기 작업을 실행.   
컬렉션의 각 항목에 대해 비동기 작업을 실행하려는 경우 동적으로 구축해야 한다.   


## 1. Callback 사용

```javascript
function delay2(m, t, cb) {
    setTimeout(() => {
        console.log(m);
        cb();
    }, t);
}
```

### 2-1 iterate 재귀함수 사용

```javascript
function iterate2(tasks, index) {
    if (index === tasks.length) {
        return console.log('complete');   
    }
    const task = tasks[index];
    delay2(task, task * 1000, () => iterate2(tasks, index + 1));
}

iterate2([1, 2, 3]);
// 1 --- 1초 후
// 2 --- 3초 후
// 3 --- 6초 후
```

- 배열의 값들을 비동기적으로 매핑할 수 있다.
- 연산의 결과를 다음 반복에 전달해 reduce 알고리즘을 구현할 수 있다.
- 특정 조건이 충족되면 루프를 조기에 중단할 수 있다.
- 무한한 요소에 대한 반복도 가능하다.

## 2. Promise 사용

```javascript
let delay = (f, t) => new Promise((resolve, reject) => setTimeout(() => resolve(f()), t));
let delay1 = (m, t) => delay(() => console.log(m), t);
```

비동기 함수가 Promise 를 반환하는 경우 컬렉션의 reduce 함수에서 async/awiat 를 사용해 비동기 작업을 순서대로 실행할 수 있다.

### 2-1 reduce 함수 사용

```javascript
let ar1 = async arr => {
  const awaits = arr.reduce((acc, cur) => {
    acc.push(delay1(cur, cur * 1000));
      return acc;
  }, []);
  await Promise.all(awaits);
}

let ar2 = arr => arr.reduce(async (acc, cur) => {
  const a = await acc.then();
  a.push(await delay1(cur, cur * 1000));
  return a;
}, Promise.resolve([]));

ar1([1, 2, 3]);
// 1 --- 1초 후
// 2 --- 2초 후
// 3 --- 3초 후

ar2([1, 2, 3]);
// 1 --- 1초 후
// 2 --- 3초 후
// 3 --- 6초 후
``` 

### 2-2 iterate 재귀함수 사용
```javascript
async function iterate1(tasks, index) {
  if (index === tasks.length) {
    return console.log('complete');
  }
  const task = tasks[index];
  await delay1(task, task * 1000);
  iterate1(tasks, index + 1);
}

iterate1([1, 2, 3]);
// 1 --- 1초 후
// 2 --- 3초 후
// 3 --- 6초 후
```
