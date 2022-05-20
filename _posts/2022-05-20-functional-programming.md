---
layout: post
title: 함수형 프로그래밍
date: 2021-08-01 08:00:00 + 0900
categories: Functional
ref: functional programming, javascript
---

# 함수형 프로그래밍

## 1. 함수형 프로그래밍 이란?
- 대입문 없이 프로그래밍을 하는 것.   
- 함수를 인자로 받고 함수를 계산하고 함수를 반환하는 프로그래밍 → 일급함수   
- 참조투명성 : 함수를 호출하는 부분을 함수가 반환하는 값으로 바꾸어도 프로그램이 정상 동작한다. → 순수함수   
- 불변성 : 변수에 값을 대입해 문제를 해결하는 기존 방법과 다르게 한번 초기화 되어 설정된 값은 변경하지 않는다.   
- 영속적인 데이터 구조 : list.push(obj) 할 경우 새로운 요소를 추가해 반환하는 것 같지만 그렇지 않다.    
기존 데이터는 그대로 두고 데이터를 바라보는 수많은 시작점들을 설정해 새로운 데이터 구조로 보여지도록 한다.   
- 지연평가 : 코드 실행 즉시 평가하지 않는다. 함수형 프로그래밍은 일급함수를 사용하기 때문에 값이 필요한 시점에 평가할 수 있다.

## 2. 왜 함수형 프로그래밍이 좋은가?
- 논리적이지 않고 예상하지 못한 문제가 발생하는 상황이 적다.
- 사용하는 함수는 입력 값에 정해진 출력 값만 리턴하면 되므로 테스트가 쉽다.
- 코어의 개수와 스레딩의 증가로 동시성 문제가 증가하고 있다. 함수형 프로그래밍은 대입문이 없기 때문에   
동시성 문제에서 자유롭다.   

## 3. 예시
제곱을 구하는 함수형 프로그래밍

```javascript
const log = console.log;
const integers = function *(i = 0) {
  while (true) yield i++;
}
const limit = function *(l, iter) {
  for (const n of iter) {
    yield n;
    if (n == l) return;
  }
}
const map = (f, iter) => {
  const res = [];
  for (const n of iter) {
    res.push(f(n));
  }
  return res;
}
const squares = n => n * n;
const squaresOf = l => map(square, limit(l, intergers(1)));

log(squaresOf(5));
// [1, 4, 9, 16, 25]
```
