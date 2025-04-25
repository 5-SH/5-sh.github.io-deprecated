---
layout: post
title: Javascript prototype 과 상속
date: 2021-04-07 01:10:00 + 0900
categories: [javascript]
tags: [javascript, js, class]
---

#  Javascript prototype 과 상속

## 1. Object.create 함수
  Object.create(proto) 함수는 \_\_proto__ 를 속성으로 가지고 \_\_proto__ 속성 값을 proto 인자 지정된 객체를 반환한다.
  
## 2. call() 함수
  call() 은 이미 할당되어 있는 다른 객체의 속성을 호출하는 해당 객체에 재할당할 때 사용한다.  
  call() 메소드는 주어진 this 값 및 각각 전달된 인수와 함께 함수를 호출한다.   
  this 는 현재 객체를 참조하며 call() 은 인수 목록을, apply() 는 인수 배열 하나를 받는다.   
  
#### 객체의 생성자 연결에 call 사용
  ```javascript
  function Product(name, price) {
    this.name = name;
    this.price = price;
  }
  
  function Toy(name, price) {
    Product.call(this, name, price);
    this.category = 'toy';
  }
  
  console.log(new Toy('robot', 10).name));
  // output: 'robot'
  ```
  
#### 함수 호출 및 'this'를 위한 문맥 지정에 call 사용
  ```javascript
  function greet() {
    var reply = [this.animal, 'sleep', this.sleepDuration].join(' ');
    console.log(reply);
  }
  
  var obj = {
    animal: 'cats', sleepDuration: '12 hours'
  };
  
  greet.call(obj);
  // output: cats typically sleep 12 hours
  ```
  
## 3. 프로토타입 체인을 통한 상속 구조
![FT_2021-04-07 02_03_07 215](https://user-images.githubusercontent.com/13375810/113752739-466e3800-9748-11eb-8555-b89f45382398.png)
  
## 4. 생성자 정의
```javascript
function Parent(p) {
  this.p = p;
}

function Child(p, c) {
  this.c = c
}
```
![FT_2021-04-07 02_08_42 044](https://user-images.githubusercontent.com/13375810/113752792-5554ea80-9748-11eb-90dc-7796495ad583.png)


## 5. 프로토타입 객체 연결
  Child prototype object 의 \_\_proto__ 가 Parent prototype object 를 가리키도록 해야한다.   
  \_\_proto__ 를 직접 조작하면 안되기 때문에 Child.prototype.\_\_proto__ = Parent.prototype 은 사용할 수 없다.   
  따라서 Parent.prototype object 를 가리키는 Child prototype object 을 새로 생성해 Child.prototype 에 연결한다.
  
## 6. Parent prototype object 를 가리키는 Child prototype object 생성, 연결
  ```javascript
  function Parent(p) {
    this.p = p;
  }

  function Child(p, c) {
    this.c = c
  }
  
  Child.prototype = Object.create(Parent.prototype);
  ```
  연결된 Child prototype object 에 constructor 가 없기 때문에 constructor 를 직접 할당해 준다.
  ```javascript
  function Parent(p) {
    this.p = p;
  }

  function Child(p, c) {
    this.c = c
  }
  
  Child.prototype = Object.create(Parent.prototype);
  Child.constructor = Child;
  ```
  
## 7. 생성자 연결
마지막으로 생성자가 연결되어 있지 않아 Parent 의 속성이 Child 에 전달되지 않았다. call() 함수를 사용해 연결해 준다.
  ```javascript
  function Parent(p) {
    this.p = p;
  }

  function Child(p, c) {
    Parent.call(this, p);
    this.c = c
  }
  
  Child.prototype = Object.create(Parent.prototype);
  Child.constructor = Child;
  ```
