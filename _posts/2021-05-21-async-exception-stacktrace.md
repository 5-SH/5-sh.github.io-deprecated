---
layout: post
title: 비동기 상황에서 예외와 스택 트레이스
date: 2021-05-21 17:00:00 + 0900
categories: [javascript]
tags: [javascript, exception, stacktrace]
---

출처 : https://preamtree.tistory.com/168

# 비동기 상황에서 예외와 스택 트레이스
비동기 함수에서 예외 발생 시 스택 트레이스가 출력되지 않는다.

## 스택 트레이스가 없어지는 상황
```javascript
async function funcOne() {
  throw new Error('Error here prints the complete stack');

  await new Promise(resolve => {
      setTimeout(() => {
          resolve();
      }, 1000);
  });
}

async function funcTwo() {
  await funcOne();
}

async function funcThree() {
  await funcTwo();
}

funcThree().catch(err => console.error(err));
```

![async-stacktrace-1](https://user-images.githubusercontent.com/13375810/119098181-823b3380-ba50-11eb-887c-bd0164905a29.jpg)

Promise 의 setTimeout 비동기 함수가 평가되기 전에 예외를 던졌기 때문에   
콜스택에 funcOne, funcTwo, funcThree 함수가 남아있다.

![Screenshot_20210521-163657_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100511-fd054e00-ba52-11eb-9e8e-599e7b7f3b9f.jpg)
![Screenshot_20210521-163738_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100523-0098d500-ba53-11eb-886d-41de11a6d87a.jpg)
![Screenshot_20210521-163746_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100535-0393c580-ba53-11eb-9e28-a1f0942a8584.jpg)
![Screenshot_20210521-163755_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100553-0989a680-ba53-11eb-950d-0ce19a0f7984.jpg)
![Screenshot_20210521-163823_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100572-0c849700-ba53-11eb-8d2e-e1cad56ce2cd.jpg)

<br/>

```javascript
async function funcOne() {
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 1000);

    throw new Error('Error here prints the complete stack');
  });
}

async function funcTwo() {
  await funcOne();
}

async function funcThree() {
  await funcTwo();
}

funcThree().catch(err => console.error(err));
```

![async-stacktrace-2](https://user-images.githubusercontent.com/13375810/119100136-9a13b700-ba52-11eb-8661-b7749ce89dcc.jpg)

Promise 의 setTimeout 비동기 함수가 평가되었기 때문에   
콜스택에 funcOne, funcTwo, funcThree 함수가 남아있지 않다.

![Screenshot_20210521-163954_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100918-66855c80-ba53-11eb-8f5e-5a2e420bdd47.jpg)
![Screenshot_20210521-164001_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100949-6f762e00-ba53-11eb-8b8f-237b97b42555.jpg)
![Screenshot_20210521-164036_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100969-72711e80-ba53-11eb-8d0a-f0700daabe20.jpg)
![Screenshot_20210521-164042_Samsung Internet](https://user-images.githubusercontent.com/13375810/119100984-7604a580-ba53-11eb-9579-d995c29cfbe3.jpg)
![Screenshot_20210521-164049_Samsung Internet](https://user-images.githubusercontent.com/13375810/119101005-7ac95980-ba53-11eb-8d4a-cdbfcf079808.jpg)
![Screenshot_20210521-164058_Samsung Internet](https://user-images.githubusercontent.com/13375810/119101010-7e5ce080-ba53-11eb-83c1-9313eb968096.jpg)
![Screenshot_20210521-164110_Samsung Internet](https://user-images.githubusercontent.com/13375810/119101026-8157d100-ba53-11eb-881e-fd499f5298f1.jpg)
![Screenshot_20210521-164117_Samsung Internet](https://user-images.githubusercontent.com/13375810/119101033-8452c180-ba53-11eb-84c6-199a2f4b12ed.jpg)

<br/>

## 사라진 스택 트레이스를 출력하는 방법
1. node.js 12 버전부터 --async-stack-traces 옵션을 통해 비동기 상황에서   
예외 발생 시 스택 트레이스를 기억해 출력하도록 할 수 있다.   
최신 브라우저 콘솔에는 기본으로 적용되어 비동기 상황에서 스택 트레이스가 출력된다.

2. Node.js 의 fs 네이티브 모듈의 비동기 함수의 에러는 스택 트레이스를 출력하지 않는다.   
모듈 개발자가 방법을 찾아보려 했지만 성능 문제를 극복하지 못해 아직 해결하지 못했다고 한다. (https://github.com/nodejs/node/issues/30944)   
<br/>
비동기 함수의 가장 가까운 곳에서 에러를 catch 해 스택 트레이스를 생성할 수 있도록 개발해 문제를 해결했다.
비동기 fs 함수를 Promise 로 감싸고 에러 발생 시 reject 하도록 한다.   
발생된 reject 를 promise-catch 해 CustomAsyncError 객체를 만들어 다시 throw 한다.   
CustomAsyncError 는 throw 된 지점에서 스택 트레이스를 생성하고, 생성된 스택 트레이스에 reject 에서 전달한 err.stack 을 추가하도록 수정했다.

```javascript
// async fs function
await new Promse((resolve, reject) => {
  const stream = fs.createReadStream(this.filepath);
  stream
      .on('error', err => reject(err))
      .on('open', () => resulve(stream));
}).catch(err => {
  throw new CustomAsyncError(err);
});


// custom async error object
class CustomAsyncError extends Error {
  constructor(err) {
    ... 
    super(err.message);

    if (Error.captureStacktrace) {
      Error.captureStackrace(this, CustomAsyncError);
    }

    if (err) {
      const idx = this.stack.indexOf('\n');
      this.stack = err.stack + '\n' + this.stack.substring(idx + 1);
    }
  }
}
```
