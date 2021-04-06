---
layout: post
title: Javascript prototype
date: 2021-04-06 20:15:00 + 0900
categories: Javascript
ref: Javascript, js
---
# Javascript Prototype

## 1. 프로토타입 기반 프로그래밍
  객체의 원형인 프로토타입을 이용해 새로운 객체를 만들어 내는 프로그래밍이다.   
  프로토타입 구조를 이용해 객체를 확장해 나간다
  
## 2. prototype object, prototype link
> #### 2-1) prototype object
> - prototype object 는 객체다. Constructor 속성과 prototype link(\[[prototype]] 또는 \_\_proto__) 속성을 가진다.   
> - prototype object 는 생성되는 객체의 원형이 될 객체이고 다른 객체처럼 속성을 추가, 삭제할 수 있다.   
> - 함수는 Constructor 자격이 있어 객체를 생성할 수 있다. JS 의 객체는 함수를 통해 생성된다.   
> - 함수를 정의하면 함수와 prototype object 가 생성된다.   
> - 함수는 prototype 속성을 통해 prototype object 를 참조한다.
   
> #### 2-2) prototype link
> - prototype link(\[[prototype\]] 또는 \_\_proto__) 는 객체가 생성될 때 조상이었던 함수의 prototype object 를 가리킨다.   
> - 모든 객체는 prototype link 속성을 가진다.   
> - js 의 모든 객체는 Object 객체의 prototype 을 기반으로 확장되었다. 
> - Object prototype object 의 prototype link 는 null 을 참조한다.
> - 객체에서 속성을 찾지 못하면 prototype link 를 따라가며 속성을 찾는다. 속성을 찾지 못하면 undefined 를 반환한다.   

## 3. 객체 생성 시 prototype 구조
![FT_2021-04-06 20_38_58 550](https://user-images.githubusercontent.com/13375810/113706395-9aadf380-9719-11eb-9d3e-bfbef4e35a3f.png)
