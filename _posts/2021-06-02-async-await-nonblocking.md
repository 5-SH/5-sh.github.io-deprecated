---
layout: post
title: async/await 는 Non-blocking 일까?
date: 2021-06-02 23:00:00 + 0900
categories: [javascript]
tags: [javascript, async, await, nonblocking]
---

# async/await 는 Non-blocking 일까?

## Promise, async/await, blocking/non-blocking, async/sync

1. Promise : Promise 는 비동기 상황을 일급 값으로 다룰 수 있도록 한다. 일급 값이 되면 변수에 할당할 수 있고 함수의 인자나 리턴 값으로 사용할 수 있다.
2. async/await : async/await 는 비동기 상황을 동기적인 문장으로 다룰 수 있도록 한다. async 함수는 Promise 를 반환하고 await 는 Promise 를 평가한다.
3. blocking/non-blocking : 호출되는 함수가 바로 리턴하느냐 마느냐 이다.
4. async/sync : 호출되는 함수의 작업 완료와 리턴 값을 누가 신경쓰냐 이다. 호출되는 함수에 callback 을 전달해서 함수가 완료되면 callback 을 실행하도록 하면 async 이고, 호출한 함수가 작업 완료 후 리턴을 기다리거나 계속 확인하면 sync 이다.

## async/await
MDN 은 await 가 실행되는 시점에 async 함수의 내부 실행을 멈춘다고 설명한다. async 내부의 다음 코드들이 멈추기 때문에 await 동작은 blocking 동작이 아닐까?   
```javascript
... DB Connection code

async function fetch(query) {
  return new Promise(resolve => {
    dbConnection.query(query, result => {
      resolve(result);
    });
  });
}

async function handleQueryRequest(query) {
  ...
  const result = await fetch(query);
  ... handle query result code
}

...
await handleQueryRequest(userReqQuery);
...
```
위 코드에서 handleQueryRequest async 함수는 fetch 함수가 실행되고 멈추게 된다. 이 때, result 에 fetch 함수의 반환 값이 저장되길 기다리고 코드의 실행이 멈추기 때문에 blocking 동작이 아닐까 생각된다.  
<br/>
하지만 실제로 awiat 는 async 내부 코드들의 실행을 멈추지 않는다.   
보이지 않는 .then 을 통해 다음 코드들을 담아둔다. await 의 실행 방식은 함수를 Promise 체인으로 작성하는 것과 같다고 보면 된다.   
따라서 실제로 인터프리터의 실행을 멈추는 것은 아니고 여전히 다른 이벤트가 이벤트 핸들러를 실행할 수 있는 상태인 것이다.    
await 가 실행되는 순간 해결되지 않은 Promise 를 반환하고 다른 것을 실행하다가 Promise 가 값을 반환하는 시점에 이벤트가 발생해 다음 코드를 실행할 수 있게 된다.


