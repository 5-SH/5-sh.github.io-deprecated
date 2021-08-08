---
layout: post
title: 자바스크립트의 비동기 순차 실행
date: 2021-08-09 03:00:00 + 0900
categories: Javascript
ref: Javascript, async, sequential
---

# 자바스크립트의 비동기 순차 실행

```javascript
let ar1 = async arr => {
  const awaits = arr.reduce((acc, cur) => {
    acc.push(delay1(cur, cur * 1000));
      return acc;
  }, []);
  await Promise.all(awaits);
}
```

```javascript
let ar2 = arr => arr.reduce(async (acc, cur) => {
  const a = await acc.then();
  a.push(await delay1(cur, cur * 1000));
  return a;
}, Promise.resolve([]));
```

```javascript
async function iterate(tasks, index) {
  if (index === tasks.length) {
    return console.log('complete');
  }
    
  const task = tasks[index];
  await delay1(task, task * 1000);
  iterate(tasks, index + 1);
}
```

```javascript
ar1([1, 2, 3]);
// 1 --- 1초 후
// 2 --- 2초 후
// 3 --- 3초 후

ar2([1, 2, 3]);
// 1 --- 1초 후
// 2 --- 3초 후
// 3 --- 6초 후

iterate([1, 2, 3]);
// 1 --- 1초 후
// 2 --- 3초 후
// 3 --- 6초 후

```