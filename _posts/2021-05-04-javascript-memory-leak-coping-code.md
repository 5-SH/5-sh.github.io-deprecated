---
layout: post
title: 자바스크립트 메모리 누수 대처법
date: 2021-05-04 08:00:00 + 0900
categories: [javascript]
tags: [javascript, memory leak]
---

# 자바스크립트 메모리 관리, 누수 대처법
## 1. 개관
코드를 컴파일하면 컴파일러는 원시 데이터 타입을 검사해 필요한 메모리를 검사한다.   
그리고 필요한 만큼 스택 스페이스에 코드와 변수를 할당한다. 변수는 사용되고 후입선출로 삭제된다.   
함수는 자신만의 스택 꾸러미를 갖게되고, 모든 지역 변수와 함수의 실행이 어디까지 진행되었는지 기억하는 프로그램 카운터를 가지고 있다.   
<br>
얼마나 많은 메모리가 필요한지 컴파일 타임에 알지 못하면 스택 스페이스에 할당할 수 없다.   
이런 경우 런타임에 메모리 공간을 요구해야 한다. 이런 메모리는 힙 스페이스에서 할당 받는다.   
자바스크립트는 변수 할당 시점에 메모리 할당을 스스로 수행한다.

## 2. 메모리가 더 이상 필요하지 않을때 놓아주기
자바스크립트는 가비지컬렉터를 통해 힙 스페이스에 할당된 메모리를 수거한다.   
수거 대상 메모리는 메모리를 참조하는 변수가 스코프를 벗어날 때 처럼 더 이상 접근 불가능한 메모리를 수집한다.   
가비지 컬렉션 알고리즘의 주요 개념은 참조이다. 어떤 객체가 다른 객체에 접근할 수 있으면 참조한다고 말한다.   
객체는 자신을 가리키는 참조가 하나도 없는 경우 가비지 컬렉션 대상이 된다. 따라서 순환 참조 같은 문제가 생기면 가비지 컬렉션 대상에서 벗어나는 문제가 생길 수 있다.   
```javascript
function func() {
  var obj1 = {};
  var obj2 = {};
  obj1.p = obj2;
  obj2.p = obj1;
} 

func();
```

## 3. 마크스위프 알고리즘
가비지 컬렉터는 객체에 닿을 수 있는지 판단하기 위해 아래 세 단계를 거친다.   
1. 루트 : 코드에서 잠조되는 전역변수. 브라우저에서 window, Node.js 에서 global 객체. 가비지 컬렉터는 모든 루트의 완전한 목록을 만들어 낸다.
2. 그 다음 모든 루트와 자식을 검사해 활성화 여부를 표시한다. 루트가 닿을 수 없는 것들은 가비지로 표시된다트
3. 마지막으로 가비지 컬렉터는 활성으로 표시되지 않은 모든 메모리를 OS 에 반환한다.   

마크스위프 알고리즘을 활용하면 함수 호출에 값을 반환한 순환참조 객체는 전역 객체에서 닿을 수 없기 때문에 메모리가 수거되어, 순환참조 문제가 해결된다.

## 4. 흔한 메모리 누수 - 전역변수
자바스크립트는 선언되지 않은 변수가 참조되면 전역 객체에 새로운 변수를 생성한다. 그리고 this 를 잘못 사용할 경우 전역 변수를 생성할 수 있다.
```javascript
function func(arg) {
  foo = "some text";
}

//위 코드는 아래 코드와 동일하다
function func(arg) {
  window.bar = "some text";
}

// this 는 global 을 가리킴
function func(arg) {
  this.bar = "some text";
}
```
자바스크립트 파일 상단에 __use script__ 를 사용하면 예상치 못한 전역변수 생성을 막을 수 있다.

## 5. 흔한 메모리 누수 - 잊혀진 타이머 혹은 콜백 함수
```javascript
var serverData = loadData();
setInterval(() => {
  var renderer = document.getElementById('renderer');
  if (renderer) {
    renderer.innerHTML = JSON.stringify(serverData);
  }
}, 5000);
```
인터벌 타이머는 활성 상태 이므로 가비지 컬렉터는 타이머 핸들러 함수나 함수 내부 변수를 수거하지 않는다.   
따라서 많은 데이터를 가지고 있는 serverData 도 타이머 핸들러 함수가 참조해 수거되지 않는다.   
객체 사용이 끝나면 그 옵저버는 제거하는 것이 모법사례 이지만, 요즘 브라우저의 가비지 컬렉터는 순환참조를 탐지하고 처리하는 가비지 컬렉터를 지원하기 때문에 필수는 아니다.

## 6. 흔한 메모리 누수 - 클로저
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
클로저 함수에서 발생하는 메모리 누수에 대한 자세한 설명은 아래 링크를 참고한다.   

[자바스크립트 클로저 메모리 누수](https://5-sh.github.io/javascript/2021/04/27/javascript-closure-memory-leak.html)

## 7. 흔한 메모리 누수 - DOM 에서 벗어난 요소 참조
테이블 내 열의 내용을 빠르게 업데이트하고 싶어 셀에 대한 참조를 배열이나 변수에 저장하면, 동일한 DOM 요소에 대해 두 개의 참조가 존재한다.   
이 경우 테이블을 DOM 에서 제거해부, 셀은 테이블의 자식 노드이고 자식 노드는 부모에 대한 참조를 갖고 있기 때문에 테이블 셀에 대한 참조 하나로도 전체 테이블이 메모리에 남아 있게 된다.   
