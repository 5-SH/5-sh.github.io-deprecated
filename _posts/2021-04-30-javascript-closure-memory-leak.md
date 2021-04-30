---
layout: post
title: 자바스크립트 클로저 메모리 누수
date: 2021-04-27 22:00:00 + 0900
categories: Javascript
ref: Javascript, closure, memory leak
---

# 자바스크립트 클로저 메모리 누수
클로저에 의해 참조된 지역변수는 자신이 정의된 함수가 끝나있고,   
자신이 정의된 함수의 스코프에 선언된 다른 함수들도 Garbage Collected 되어야 Garbage Colleted 된다.   

## 1. GC 되는 클로저
```javascript
var theThing = null;
var replaceThing = function () {
  var originalThing = theThing;
  theThing = {
    longStr: new Array(1000000).join('*'),
    someMethod: function () {
      console.log(someMessage)
    }
  }
}
setInterval(replaceThing, 1000);
```
1초 마다 replaceThing 함수를 실행하고 theThing 에 큰 사이즈의 배열을 할당한다.   
그리고 theThing 의 이전 값을 originalThing 에 저장한다. 
someMethod 는 클로저로 originalThing 을 참조할 수 있다. 따라서 someMethod 가 살아 있는 동안 originalThing 이 유지된다.   
originalThing 에서 theThing 의 이전 값을 참조하기 때문에 메모리 사용량이 계속 증가될 수 있다.   
그러나 V8 과 같은 Javascript 엔진은 originalThing 이 someMethod 에서 실제로 사용되지 않는 것을 찾아내, someMethod 의 렉시컬 환경에 originalThing 을 추가하지 않는다.   
따라서 이전 theThing 값은 replaceThing 함수가 끝난 뒤 GC 된다.   

## 2. GC 되지 않는 클로저
```javascript
var theThing = null;
var replaceThing = function () {
  var originalThing = theThing;
  var unused = function () {
    if (originalThing) console.log('hi');
  }
  theThing = {
    longStr: new Array(1000000).join('*');,
    someMethod: function () {
      console.log(someMessage);
    }
  }
}
setInterval(replaceThing, 1000);
```
위 코드는 longStr 에서 메모리 누수가 발생한다.   
![Screenshot_20210501-012454_Samsung Internet](https://user-images.githubusercontent.com/13375810/116724813-11d65f00-aa1c-11eb-8e34-d3d326f5a7e0.jpg)   

unused 변수에 originalThing 을 참조하는 클로저 함수가 할당되었다.   
someMethod 는 originalThing 을 참조하지 않는다. 그리고 unused 에 할당된 클로저 함수는 실행되지 않고 replaceThing 이 실행되고 나서 정리된다.   
<br>
그러나 위 코드는 someMethod, unused 두 클로저 함수가 같은 렉시컬 스코프를 사용하기 때문에 메모리 누수가 발생한다.   
unused 클로저 함수에서 originalThing 을 참조했기 때문에 someMethod 클로저 함수에서도 originalThing 을 참조한 것과 같은 결과를 가진다.   
<br>
코드의 Execution Context 와 Active Object 구조는 아래와 같다.
![FT_2021-04-30 16_49_28 143](https://user-images.githubusercontent.com/13375810/116726507-58c55400-aa1e-11eb-8472-fde75b8810ca.png)

메모리 누수를 없애려면 replaceThing 함수 끝에서 originalThing 에 null 을 할당해 이전 theThing 값에 대한 참조를 없애줘야 한다.
