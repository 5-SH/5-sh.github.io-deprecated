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

## 5. well-formed 이터레이터

