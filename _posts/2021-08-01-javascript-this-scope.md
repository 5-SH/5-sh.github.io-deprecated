---
layout: post
title: JavaScript 의 this 
date: 2021-08-01 08:00:00 + 0900
categories: [javascript]
tags: [javascript, this, scope]
---

# JavaScript 의 this

## 1. 렉시컬 스코프
자바스크립트는 렉시컬 스코프를 사용한다.    
렉시컬 스코프는 변수나 함수가 정의된 곳의 컨텍스트 를 사용한다.   
자바스크립트는 함수 만이 자신의 스코프를 가질 수 있다.   
let, const 키워드는 블록 스코프를 사용한다.

```javascript
function foo1() {
  var x = 1;
  console.log(x); // 1
  if (true) {
    var x = 2;
    console.log(x); // 2
  }
  console.log(x); // 2
}
foo();

function foo2() {
  var x = 1;
  if (true) {
    (function () {
      var x = 2;
      console.log(x); // 2
    })();
  }
  console.log(x); // 1
}
foo2();
```

## 2. 일반 함수의 this
함수가 어떻게 호출 되었는지에 따라 this 에 바인딩할 객체가 동적으로 결정된다.

### 2-1. 일반 함수로 호출
일반 함수의 this 는 기본적으로 window 객체이다.   
this 를 생성자 혹은 객체의 메소드에서 사용하지 않는 경우 this 는 전역 객체가 된다.

```javascript
const age1 = 100;
function foo() {
  const age1 = 99;
  bar(age1);
}

function bar(age) {
  console.log(this.age); // 100
}

foo();
```

### 2-2. 오브젝트 메소드 형식으로 실행
오브젝트가 this 로 설정된다.

```javascript 
function foo() {
  console.log(this.age2);
}
const age2 = 100;
const ken2 = {
  age2: 36,
  foo: foo
}
const wan2 = {
  age2: 32,
  foo: foo
}
ken2.foo(); // 36
wan2.foo(); // 32
```

### 2-3. call, apply, bind 를 통해 this 를 바꿀 수 있다.
- call, apply : 함수 내 this 를 call, apply 함수의 인자에 전달되는 값으로 바꾸고 함수를 호출한다.
- bind : 함수 내 this 를 바꾸기만 하고 함수를 호출하지는 않는다.

```javascript
var age3 = 100;
function foo3() {
  console.log(this.age3);
}

var ken3 = {
  age3: 35,
  log: foo3
}

kenLog();
foo3.call(ken3); // 35
foo3.apply(ken3); // 35
```

### 2-4. new 로 생성된 객체
new 로 생성된 객체가 this 로 할당된다.

```javascript
function Person4() {
  this.name = 'ken';
}

var ken4 = new Person4();
console.log(ken4); // Person4 { name: 'ken' }
```

## 3. 화살표 함수의 this
화살표 함수의 this 는 렉스컬 스코프로 상위 스코프의 this 를 가리킨다.   
화살표 함수는 call, apply, bind 메소드를 사용해 this 를 변경할 수 없다.

### 3-1. 생성자 함수의 this
```javascript
function Person1() {
  // Person1 생성자는 this 를 자신의 인스턴스로 정의
  this.age = 0;

  // 일반 함수의 this 는 window 객체
  setInterval(function growUp() {
    // 비엄격 모드에서 growUp() 함수의 this 는 전역 객체로 정의하고
    // 이는 Person1 생성자에 정의된 this 와 다름
    console.log(this.age++);
  }, 1000);)
}

function Person2() {
  const that = this;
  that.age = 0;

  setInterval(function growUp() {
    // 콜백은 that 변수를 참조하고 이 것은 값이 기대한 객체이다.
    console.log(that.age++);
  }, 1000);
}

function Person3(0 {
  this.age = 0;
  setInterval(() => {
    console.log(this.age++);
  }, 1000);
});

const p1 = new Person1();
const p2 = new Person2();
const p3 = new Person3();
```

### 3-2. prototype 의 this
```javascript
function Prefixer(prefix) {
  this.prefix = prefix;
}

Prefixer.prototype.prefixArray1 = function (arr) {
  return arr.map(function (x) {
    // prefixArray1 함수를 호출하는 곳의 this 를 가져온다.
    // 아래 bind 함수가 주석이면 this 는 window 객체가 된다.
    return this.prefix + ' ' + x;
  })
  // this: Prefixer 생성자 함수의 인스턴스
  // .bind(this);
}

Prefixer.prototype.prefixArray2 = function (arr) {
  // this 는 상위 스코프인 prefixArray2 메소드 내의 this 를 가리킨다.
  console.log('prefixArray2 this', this);
  return arr.map(x => `${this.prefix} ${x}`);
}

const pre = new Prefixer('Hi');
console.log(pre.prefixArray1(['Lee', 'Kim'])); // ["undefined Lee", "undefined Kim"]
console.log(pre.prefixArray2(['Lee', 'Kim'])); // ["Hi Lee", "Hi Kim"]
```

### 3-3. 화살표 함수로 메소드 정의
화살표 함수로 메서드를 정의하는 것은 피해야 한다.   
화살표 함수 내부의 this 는 메서드를 소유한 객체를 가리키지 않고, 상위 컨텍스트인 window 를 가리킨다.

```javascript
const person3 = {
  name3: 'Lee',
  sayHi: () => console.log(`Hi ${this.name3}`)
}
const person4 = {
  name4: 'Lee',
  sayHi() {
    console.log(`Hi ${this.name4}`);
  }
}

person3.sayHi(); // Hi undefined
person4.sayHi(); // Hi Lee
```

### 3-4. 화살표 함수로 prototype 을 정의
화살표 함수로 prototype 에 할당하는 경우 this 는 상위 컨텍스트인 window 객체를 가리킨다.   

```javascript
function Person5() {
  this.name5 = 'Lee';
}

Person5.prototype.sayHi = () => console.log(`Hi ${this.name4}`);

const p5 = new Person5();
p5.sayHi() // Hi undefined
```

### 3-5. 화살표 함수를 생성자 함수로 사용
화살표 함수는 생성자 함수로 사용할 수 없다.   
생성자 함수는 prototype 프로퍼티를 가지고 prototype 프로퍼티가 가리키는 prototype 객체의 constructor 를 사용한다.   
하지만 화살표 함수는 prototype 프로퍼티를 가지고 있지 않다.

```javascript
const Foo4 = () => {};
console.log(Foo4.hasOwnProperty('prototype')); // false

const foo4 = new Foo4(); // TypeError: Foo is not a constructor
```