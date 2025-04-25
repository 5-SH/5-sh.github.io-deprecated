---
layout: post
title: JavaScript 의 실행 컨텍스트
date: 2021-10-13 00:30:00 + 0900
categories: [javascript]
tags: [javascript, ao, ec]
---

# 실행 컨텍스트(EC)
자바스크립트 코드가 실행되기 위한 환경.      
EC 는 실행 컨텍스트 스택(콜 스택) 에 추가된다.   
함수를 호출하면 실행된다.   
실행이 끝난 함수의 EC 는 실행 컨텍스트 스택에서 제거된다.

## 1. 실행 컨텍스트 구조
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/136986797-d55aa7c6-ea42-4011-a83d-ab8264038473.png" />
  <p style="font-style: italic; color: gray;">출처 - https://poiemaweb.com/js-execution-context</p>
</figure>

  - VO(Variable Object)   
    - 코드 실행에 필요한 변수, 함수 선언문(함수 표현식은 제외), 파라미터를 저장하며 객체 형식이다.   
    - 전역 컨텍스트의 VO 는 전역 객체를 가리킨다.   
    - 함수 컨텍스트의 VO 는 AO 를 가리킨다.   
    
  - SC(Scope Chain)   
    - VO 또는 전역 객체를 가리키며, 중첩된 함수의 스코프에 대한 레퍼런스를 저장한다.   
    - SC 는 변수를 검색하기 위해 사용되며 프로퍼티를 검색하기 위해 사용되는 것은 프로토타입 체인이다.
    - SC 는 함수에 등록된 [[Scope]] 프로퍼티로 참조할 수 있다.

  - this   
    - [함수 호출 방법에 따라 this 가 결정된다.](https://5-sh.github.io/javascript/2021/08/01/javascript-this-scope.html)

## 2. 실행 컨텍스트 생성 과정
```javascript
var x = 'xxx';

function foo () {
  var y = 'yyy';

  function bar () {
    var z = 'zzz';
    console.log(x + y + z);
  }
  bar();
}

foo();
```

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/136993805-a6a93866-c7b7-4795-972f-fa009704b5e4.png" />
  <p style="font-style: italic; color: gray;">출처 - https://poiemaweb.com/js-execution-context</p>
</figure>

<br />

실행 컨텍스트 생성 과정은 다음과 같다.   
> 1. EC 생성과 AO 생성
> 2. SC 생성과 초기화
> 3. VO 설정
> 4. this 설정

### 2-1) EC 생성과 AO 생성
- 전역 코드에 진입하면 전역 객체(GO)를 생성한다.   
- 전역 객체는 하나만 존재하고 전역 객체에는 빌트인 객체(Math, String, Array 등)와 BOM, DOM 등이 설정되어 있다.   
- 전역 EC 생성된 이후 함수를 만나면 AO 를 생성한다.

### 2-2) SC 생성과 초기화
- 생성된 AO(전역 EC 인 경우 GO) 를 SC 에 연결하고 이전 EC 의 SC 들을 추가한다.
- 함수는 자신의 실행 환경을 가리키는 SC 참조([[scope]])를 가지고 있다.   
이 참조를 통해 참조하려는 변수가 스택에서 pop 된 EC 의 VO 에 등록된 변수라도 참조 할 수 있게된다.
- 이 원리로 자바스크립트의 클로저를 사용할 수 있다.

### 2-3) VO 설정
- VO 에 프로퍼티와 값을 설정하는 변수 객체화를 진행한다.
- 변수, 매겨변수, 인수, 함수 선언을 VO 에 추가한다.
- 매개변수와 인수 설정 → 함수 선언 → 변수 설정 순서로 진행한다.

> #### 2-3-1) 매개변수, 인수 설정
> - 함수 코드인 경우 매개변수를 프로퍼티로 인수를 값으로 VO 에 설정한다.
> 
> #### 2-3-2) 함수 선언
> - 함수 표현식을 제외한 함수 선언을 프로퍼티로, 함수 객체를 값으로 VO 에 설정한다.
> - 이 작업으로 함수 호이스팅이 된다.
> 
> #### 2-3-3) 변수 설정
> - var 키워드로 변수가 선언된 경우 변수명을 프로퍼티로, undefined 가 VO 값으로 설정된다.
> - 변수는 선언, 초기화, 할당 세 단계로 나뉘어 처리된다.
> - 선언 단계는 VO 에 변수를 등록한다.
> - 초기화 단계는 VO 에 등록된 변수를 메모리에 할당한다.
> - 할당 단계는 undefined 로 초기화된 변수에 실제 값을 할당한다.
> - var, let, const 모두 호이스팅 되지만 var 만 선언과 동시에 undefined 로 값을 할당한다.   
> 따라서 let, const 는 선언문 전에 호출하면 메모리 할당이 안되어 있어 에러가 발생한다.
> - 이 작업으로 변수 호이스팅이 된다.

### 2-4) this 설정
- 함수 호출 패턴에 따라 this 가 설정된다.