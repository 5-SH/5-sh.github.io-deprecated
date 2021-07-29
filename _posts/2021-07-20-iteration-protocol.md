---
layout: post
title: JavaScript 이터레이션 프로토콜
date: 2021-07-20 18:00:00 + 0900
categories: Javascript
ref: Javascript, iteration, iterator, iterable
---

# JavaScript 이터레이션 프로토콜
ES6 에서 도입된 이터레이션 프로토콜은 데이터 컬렉션을 순회하기 위한 프로토콜이다.   
이터레이션 프로토콜을 준수한 객체는 for...of 문으로 순회할 수 있고 Spread 문법의 피연산자가 될 수 있다.   
이터레이션 프로토콜에는 이터러블 프로토콜과 이터레이터 프로토콜이 있다.   

## 1. 이터레이션 프로토콜의 필요성
데이터 소비자(for...of, spread 문법 등) 와 데이터 소스를 연결하는 인터페이스 역할을 한다.   
다양한 데이터 소스가 각자의 순회 방식을 갖는다면, 데이터 소비자는 다양한 방식을 모두 지원해야 한다.   
하지만 이털이션 프로토콜을 준수하도록 규정하면 데이터 소비자는 이터레이션 프로토콜만 구현하면 된다.   

## 2. 이터러블
이터러블 프로토콜을 준수한 객체를 이터러블이라 한다.   
이터러블은 Symbol.iterator 메소드를 구현하거나 프로토타입 체인에 의해 상속한 객체를 말한다.   
그리고 Symbol.iterator 메소드는 이터레이터를 반환한다.   
ES6 에서 제공하는 빌트인 이터러블은 다음과 같다.   
> Array, String, Map, Set,    
> TypedArray(Int8Array, Unit8Array, Uint8Array, Uint8ClampedArray, Int16Array,Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array),   
> DOM data structure(NodeList, HTMLCollection), Arguments   

```javascript
//배열
for (const item of ['a', 'b', 'c']) {
  console.log(item);
}
/*
 * 결과
 * a
 * b
 * c
 */

// 문자열
for (const letter of 'abc') {
  console.log(letter);
}
/*
 * 결과
 * a
 * b
 * c
 */

// Map
for (const [key, value] of new Map([['a', '1'], ['b', '2'], ['c', '3']])) {
  console.log(`key : ${key} value : ${value}`);
}
/*
 * 결과
 * key : a value : 1
 * key : b value : 2
 * key : c value : 3
 */

// Set
for (const val of new Set([1, 2, 3])) {
  console.log(val);
}
/*
 * 결과
 * 1
 * 2
 * 3
 */
```
   
## 3. 이터레이터
이터레이터 프로토콜은 next 메소드를 소유한다.   
next 메소드를 호출하면 이터러블을 순회하며, value, done 프로퍼티를 갖는 이터레이터 result 객체를 반환한다.

## 4. 커스텀 이터러블
일반 객체는 이터러블이 아니다. Symbol.iterator 메소드 를 구현해 이터레이션 프로토콜을 준수하도록 구현하면 이터러블 객체가 된다.   

```javascript
const finbonacci = {
  [Symbol.iterator]() {
    let [pre, cur] = [0, 1];
    const max = 10;

    return {
      next() {
        [pre, cur] = [cur, pre + cur];
        return {
          value: cur,
          done: cur >= max
        };
      }
    };
  }
}

for (const num of fibonacci) {
  console.log(num);
}

/*
 * 결과
 * 1 2 3 5 8
 */

function fibonacciFunc(max) {
  let [pre, cur] = [0, 1];

  return {
    [Symbol.iterator]() {
      let [pre, cur] = [0, 1];
      const max = 10;

      return {
        next() {
          [pre, cur] = [cur, pre + cur];
          return {
            value: cur,
            done: cur >= max
          };
        }
      }
    }
  };
}

for (const num of fibonacciFunc(10)) {
  console.log(num);
}
```

## 5. well-formed 이터레이터
이터레이터가 자기 자신(이터러블)을 반환하는 Symbol.iterator 메소드를 가지고 있을때 well-formed 이터레이터(이터러블) 라고 한다.   
iterator 를 일부 진행한 후에 실행을 해도 진행된 것 이후로 순회가 되도록 한다.

```javascript
// well-formed 이터레이터
const arr = [1, 2, 3];
let iter = arr[Symbol.iterator]();
console.log(iter[Symbol.iterator]() == iter);
/*
 * 결과
 * true
 */


// 커스텀 well-formed 이터레이터
function fibonacciFunc2(max) {
  let [pre, cur] = [0, 1];
  return {
    [Symbol.iterator]() {
      return {
        next() {
          [pre, cur] = [cur, pre + cur];
          return {
            value: cur,
            done: cur >= max
          };
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    }
  };
}

let iter10 = fibonacciFunc2(10)[Symbol.iterator]();
console.log(iter10[Symbol.iterator]() == iter10);
/*
 * 결과
 * true
 */

iter10.next(); 
/*
 * 결과
 * {value: 1, done: false}
 */

for (const a of iter10) console.log(a);
/*
 * 결과
 * 2
 * 3
 * 5
 * 8
 */
```

## 6. 제네레이터
이터레이터이자 이터러블을 생성하는 함수 = well-formed 이터레이터를 리턴하는 함수    
제네레이터는 순회할 값을 문장으로 표현한다.   
제네레이터는 문장을 값으로 만들 수 있고 순회할 수 있도록 한다.

```javascript
function* gen() {
  yield 1;
  if (false) yield 2;
  yield 3;
  return 100;
}

// 제네레이터를 실행한 결과는 이터레이터 이다.
let iter = gen();
console.log(iter[Symbol.iterator]() == iter);
/*
 * 결과
 * true
 */

console.log(iter.next());
console.log(iter.next());
console.log(iter.next());
console.log(iter.next());
/*
 * 결과
 * {value: 1, done: false}
 * {value: 3, done: false}
 * {value: 100, done: true}
 * {value: undefined, done: true}
 */
 
// 순회할 대 리턴 값은 없이 순회하고 마지막 done 을 할 때 나오는 값이다.
for (const a of gen()) console.log(a);
/*
 * 결과
 * 1
 * 3
 */ 

// 제네레이터를 활용해 홀수만 발생시키는 이터레이터를 만들어 순회
function* infinity(i = 0) {
  while(true) yield i++;
}

function* limit(l, iter) {
  for (const a of iter) {
    yield a;
    if (a == l) return;
  }
}

function* odds(l) {
  for (const a of limit(l, infinity(1))) {
    if (a % 2) yield a;
  }
}

let iter = odds(10);
console.log(iter.next());
console.log(iter.next());
console.log(iter.next());
console.log(iter.next());
console.log(iter.next());
console.log(iter.next());
/*
 * 결과
 * {value: 1, done: false}
 * {value: 3, done: false}
 * {value: 5, done: false}
 * {value: 7, done: false}
 * {value: 9, done: false}
 * {value: undefined, done: true}
 */
```
