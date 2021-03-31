---
layout: post
title: javascipt 의 객체란?
date: 2021-03-31 23:05:00 +0900
categories: javascript
ref: javascript
---

# 객체(Object) 란?   
  자바스크립트는 객체 기반의 스크립트 언어이다. 원시 타입을 제외한 모든 값(함수, 배열 등)은 객체이다.   
  자바스크립트의 객체는 키와 값으로 구성된 프로퍼티들의 집합이다.   
  자바스크립트의 함수는 일급 객체이므로 값으로 취급할 수 있다. 객체의 프로퍼티 값으로 함수를 사용할 수 있고 일반 함수와 구분하기 위해 메소드라 부른다.   
  자바스크립트는 객체지향의 상속을 구현하기 위해 프로토타입이라 불리는 객체의 프로퍼티와 메소드를 상속 받을 수 있다.   
    
### 1. 프로퍼티
  프로퍼티는 키와 값으로 구성된다. 키로 유일하게 식별하고 존재하는 프로퍼티 키를 중복 선언하면    
  나중에 선언한 프로퍼티가 먼저 선언한 프로퍼티를 덮어 쓴다.   
    
### 2. 메소드
  객체에 제한되어 있는 함수   
    
### 3. 객체 생성 방법
  자바스크립트는 프로토타입 기반 객체지향 언어로서 클래스 개념이 없다. 클래스 없이 프로토타입 체인과 클로저로   
  상속, 캡슐화, 정보 은닉 등 객체지향 개념을 구현한다. 편의를 위해 ES6 부터 Class 라는 키워드를 제공하지만   
  Class 도 사실 생성자 함수를 사용한 syntatic sugar 이다.   
       
  #### 3-1) 객체 리터럴   
  > 일반적인 객체 생성 방식으로 중괄호를 사용해 객체를 생성한다.   
  > ```javascript
  > const person = {
  >  name: 'abc',
  >  gender: 'M',
  >  hello: function () {
  >      console.log('hello');
  >  }
  >}
  >```   
  
  #### 3-2) Object 생성자 함수   
  > Object 생성자 함수를 호출해 빈 객체를 생성하고 프로퍼티 또는 메소드를 추가해 객체를 완성한다.   
  > 생성자 함수는new 키워드 사용해 객체를 새엉하고 초기화 하는 함수다.   
  > 생성자 함수를 통해 생성된 개체를 인스턴스라 하고, Object 외에 String, Number, Boolean, Array, Date 등 빌트인 생성자 함수가 있다.   
  > 생성자 함수는 파스칼 케이스를 사용한다.   

  >```javascript
  >const person = new Object();
  >person.name = 'abc';
  >person.gender = 'M';
  >person.hello = function () { console.log('hello'); }
  >```
  > 객체 리터럴 방식은 Object 빌트인 생성자 하무로 객체를 생성하는 것을 축약 표현한 것이다.   
  > 자바스크립트 엔진은 개체 리터럴 코드를 만나면 내부적으로 Object 생성자 함수를 사용해 객체를 생성한다
    
  #### 3-3) 생성자 함수
  > 생성자 함수를 객체를 생성하기 위한 템플릿 처럼 사용할 수있다.   
  > 생성자 함수의 this 는 생성자 함수가 생성할 인스턴스를 가리킨다. 따라서 화살표 함수는 렉시컬 스코프를 가지기 때문에 생성자 함수로 사용할 수 없다.   
  > this 에 바인딩된 프로퍼티와 메소드는 public 으로 외부에서 참조 가능하다.   
  > 생성자 함수 내에서 선언된 변수는 private  로 외부에서 참조할 수 없다.   
  > 모든 함수는 생성자 함수가 될 수 있다. 일반 함수와 구분하기 위해 생성자 함수는 파스칼 케이스를 사용한다.
  >```javascript
  >function Person(name, gender) {
  >  this.name = name;
  >  this.gender = gender;
  >  this.hello = function () { console.log('hello'); }
  >}
  >```
    
### 4. 객체 프로퍼티 접근
  #### 4-1) 프로퍼티 키
  >프로퍼티 키는 일반적으로 문자열(빈 문자열 포함)을 지정한다. 자바스크립트에서 유효한 이름이 아닌 경우 따옴표를 사용한다.   

  >```javascript
  >const person = {
  >  'first-name': 'a',
  >  'last-name': 'b',
  >  gender: 'M'
  >}
  >```

  #### 4-2) 프로퍼티 값 읽기
  > 프로퍼티 값은 마침표와 대괄호를 사용해 접근할 수 있다. 대괄호에 들어가는 프로퍼티 이름은 문자열 이어야 한다.   
  > 객체에 존재하지 않는 프로퍼티를 참조하면 undefined 를 반환한다.   

  > ```javascript
  > console.log(person['fisrt-name']);
  > console.log(person.gender);
  > ```   

  #### 4-3) 프로퍼티 값 갱신과 동적 생성
  > 객체가 소유하고 있는 프로퍼티에 새로운 값을 할당하면 프로퍼티 값은 갱신된다.   
  > 객체가 소유하고 있지 않은 프로퍼티 키에 값을 할당하면 객체에 프로퍼티가 추가된다.
       
  #### 4-4) 프로퍼티 삭제
  > delete 연산자를 사용해 프로퍼티를 삭제할 수 있다.

  > ```javascript
  > const person = {
  >     'first-name': 'a',
  >     'last-name': 'b'
  >  }
  >  delete person['first-name'];
  > ```   
  
  #### 4-5) for-in 문
  > for-in 문을 사용해 객체에 포함된 모든 프로퍼티에 대해 반복문을 수행할 수 있다.   

  >```javascript
  >const person = {
  >    'first-name': 'a',
  >    'last-name': 'b',
  >    gender: 'M'
  >}
  >
  >for (const p in peson) {
  >    console.log(p, person[p]);
  >}
  >```

### 5. pass by reference
  객체의 모든 연산은 참조 값으로 처리된다. 원시 값은 값이 정해지면 변경할 수 없지만, 객체는 프로퍼티를 변경, 추가, 삭제가 가능하다.   
  객체는 동적으로 변할 수 있고 메모리 공간 확보를 예측할 수 없어 Heap 영역에 저장된다.   
  원시 값은 pass by value 로 처리된다.

```javascript
const foo = {
   val: 10
}
const bar = foo;

console.log(foo.val, bar.val); // 10 10
console.log(foo === bar); // true

bar.val = 20;
console.log(foo.val, bar.val); // 20 20
console.log(foo === bar); // true
```   

  변수 foo, bar 는 객체의 참조 값을 저장하고 있다. 따라서 참조하고 있는 객체의 val 값이 변경되면 foo, bar 모두 동일한 객체를 참조하고 있기 때문에   
  변경된 객체의 프로퍼티 값을 참조하게 된다.

```javascript
const foo = { val: 10 };
const bar = { val: 10 };

foo.val = 20;
console.log(foo.val, bar.val); // 20 10
console.log(foo === bar); // false
```
  이 경우 foo, bar 는 별개의 객체를 생성해 각각의 참조 값을 저장하고 있다.
    
### 6. pass by value
  원시 타입은 값이 복사되어 전달된다. 원시 값들은 런타임에 메모리의 스택 영역에 저장된다.

```javascript
const a = 1;
const b = a;

console.log(a, b); // 1 1
console.log(a === b); // true

a = 10;
console.log(a, b); // 10 1
console.log(a === b); // false
```

        

