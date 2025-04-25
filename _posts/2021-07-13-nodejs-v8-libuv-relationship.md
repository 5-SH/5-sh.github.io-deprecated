---
layout: post
title: Node.js 와 libuv 그리고 v8 의 관계
date: 2021-07-13 23:00:00 + 0900
categories: [nodejs]
tags: [nodejs, architecture]
---

출처 : https://medium.com/dkatalis/nodejs-architecture-relationship-between-libuv-v8-and-js-7dce74cf1c51

# Node.js 와 libuv 그리고 v8 의 관계
![FT_2021-07-14 00_06_41 167](https://user-images.githubusercontent.com/13375810/125476722-f8edc5a9-132a-408a-b578-01bb59236160.png)

## 1. libuv
파일시스템 I/O 등 OS 에서 지원하는 비동기 작업이나 OS 에서 지원하지 않는 비동기 작업에 대한 접근을 제공한다.   
libuv 는 비동기 I/O 에 중점을 둔 멀티 플랫폼 라이브러리 이다.   
주로 Node.js 를 위해 개발되었으나 Luvit, Julia, pyuv 등 에도 사용된다.

## 2. v8
JavaScript 소스 코드의 컴파일과 실행, 객체의 메모리 할당 그리고 GC 를 수행한다.   
v8 은 JIT 컴퍼일러에서 인터프리터로 바뀌고 있다.
### v8 엔진의 주요 기능
- JS 코드의 컴파일과 실행
- 콜스택 핸들링
- 객체의 메모리 할당
- GC
- 모든 데이터 타입과 연산자, 객체 그리고 함수를 제공

## 3. Node.js
v8 엔진을 기반으로 하는 JavaScript 런타임.   
JS 는 클라이언트 측 상호 작용을 위해 브라우저에서만 실행되도록 만들어졌다.   
그러나 v8 엔진 이후 브라우저 외부에서 JS 가 사용되기 시작했고, Node.js 가 출시되었다.   
Node.js 는 TCP, HTTP 등 인터넷 기본 사항에 능숙하므로 서버측 코드 작성에 적합하다.   

## 4. 전체 동작 구조
v8 은 JS 소스코드 실행과 관련된 기능을 제공한다. libuv 는 네트워크, 파일 등 시스템 자원을 비동기 I/O 로 사용하기 위해 사용한다. 그리고 OS 에서 제공하지 않는 비동기 I/O 를 위해 멀티 스레딩 모델(worker_thread) 를 지원한다.   
