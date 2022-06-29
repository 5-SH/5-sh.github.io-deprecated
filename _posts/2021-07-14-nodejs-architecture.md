---
layout: post
title: Node.js 의 구조
date: 2021-07-14 23:00:00 + 0900
categories: Nodejs
ref: Node.js, Architecture
---


출처1 : https://medium.com/@rpf5573/nodejs-event-loop-part-1-big-picture-7ed38f830f67   
출처2 : https://darrengwon.tistory.com/953   
출처3 : https://evan-moon.github.io/2019/08/01/nodejs-event-loop-workflow/#%EC%9D%B4%EB%B2%A4%ED%8A%B8-%EB%A3%A8%ED%94%84%EB%8A%94-%EC%9E%90%EB%B0%94%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8-%EC%97%94%EC%A7%84-%EB%82%B4%EB%B6%80%EC%97%90-%EC%9E%88%EB%8B%A4   

# Node.js 의 구조

## ■ JavaScript 코드 실행

JavaScript 는 하나의 메인 스레드(이벤트 루프)와 하나의 콜스택을 가진다. 그리고 메모리 할당을 관리하는 Heap 이 있다.   
async / await 와 같은 비동기 처리는 JS 를 둘러싼 런타임 환경인 브라우저, Node.js 에서 지원한다.   
Web APIs 는 브라우저, Node.js 에서 지원하는 api 이다. 환경에 따라 AJAX, Timeout 등 비동기 작업 API 를 지원한다.

![rw1](https://user-images.githubusercontent.com/13375810/125661976-d3b2044e-be31-45e5-b6a5-d28714904068.png)

### 동작과정   
1. 코드가 콜스택에 쌓이고 실행된다. 비동기 작업이면 이벤트 루프는 libuv 에 비동기 작업을 위임한다.
2. libuv 는 비동기 작업이 OS 커널에서 처리 가능한지 확인하고 가능하면 OS 에 요청하고 안되면 worker_thread 로 비동기 함수를 처리한다.
3. 비동기 작업이 완료되면 콜백 함수를 콜백 큐에 담는다.
4. 콜스택에 쌓여있는 함수가 없을 때 이벤트 루프가 콜백 함수를 콜스택에 담는다.
5. 콜스택에 쌓인 콜백 함수가 실행되고 콜스택에서 제거 된다.

## ■ libuv
libuv 는 c 로 작성되었고 윈도우나 리눅스 커널을 추상화해 래핑하는 구조다. 그리고 OS 커널에서 지원하는 비동기 작업을 알고있다.   
OS 커널에서 지원하는 비동기 작업을 발견하면 바로 커널로 작업을 넘기고, OS 에서 지원하지 않는 비동기 작업은 worker_thread 를 사용해 비동기를 처리한다.   

Node.js 는 이벤트 루프가 블로킹 되지 않도록 I/O 작업을 기다리지 않는다. Node.js 는 libuv 가 I/O 작업을 마치고 얻은 결과로 수행할 태스크를 콜백 함수로 처리한다.   
Node.js 는 이벤트 큐와 이벤트 루프를 사용해 많은 콜백 함수를 처리한다. I/O 요청을 받아서 디스크나 네트워크 장치에 일을 시키고, 작업이 끝나면 이벤트 큐에 개발자가 작성한 콜백 함수를 순서대로 담는다. 이벤트 루프는 그 콜백 함수를 하나씩 빼서 처리한다.

![FT_2021-07-15 01_44_22 640](https://user-images.githubusercontent.com/13375810/125660631-9c0e8488-dae8-41a4-ab56-d737ed2fe696.png)

## ■ Event 기반, 논블로킹, 싱글스레드 Node.js
### 1. Event 기반
Node.js 는 이벤트 리스너를 통해 이벤트가 발생하면 콜백 함수를 실행하는 방식을 사용한다.   
이벤트가 발생하면 호출되는 콜백 함수를 관리하는 것이 이벤트 루프이다.

### 2. 논블로킹 & 싱글스레드
JS 는 한 번 코드를 실행하면 중간에 멈추지 않고 콜스택이 빌 때 까지 실행한다.   
Node.js 는 싱글스레드 구조이기 때문에 한 번에 하나의 작업만 처리할 수 있다. 파일 읽기, API 호출 등 블로킹 작업을 만나면 기다려야 한다.   
따라서 Node.js 는 libuv 를 통해 블로킹 작업을 만나면 비동기 논블로킹으로 처리한다.

## ■ Event Loop & Event Queue
Event Loop 는 6 개의 Phase 로 이루어져 있고 이벤트 큐는 여러 큐로 나누어져 있다. 6 개의 Phase 가 순서대로 동작하며 Phase 마다 큐를 가지고 있다.   
nextTickQueue 와 microTaskQueue 는 이벤트 큐의 일부가 아니며, 이 큐들에 들어있는 작업은 가장 높은 우선 순위를 가지고 있어 어떤 Phase 에서든 실행될 수 있다.   

![el](https://user-images.githubusercontent.com/13375810/125665400-606baafd-8670-4336-801c-82dae8601ca1.png)   

### 1. Timer phase 
루프의 시작을 알리는 phase. 이 큐에는 setTimeout 이나 setInterval 같은 타이머들의 콜백을 저장한다.

### 2. Pending I/O callback phase
이벤트 루프의 pending_queue 에 들어있는 콜백들을 실행한다. 현재 돌고있는 루프 이전의 루프에서 작업을 수행할 때 큐에 들어왔던 콜백들 이다. 예를 들어 TCP 핸들러 콜백 함수에서 파일 I/O 를 한다면, TCP 통신이 끝나고 파일 I/O 도 끝나면 파일 I/O 가 여기에 들어오게 된다.

### 3. Idle, Prepare phase
Node.js 의 내부적인 관리를 위한 phase.

### 4. Poll phase
- Poll phase 에서 가지고 있는 watch_queue 가 비어있다면, 곧바로 다음 phase 로 넘어가지 않고 잠깐 대기한다.
- wach_queue 가 비어있지 않다면 큐가 비거나 시스템 최대 실행 한도에 다다를 때까지 동기적으로 모든 callback 을 실행한다.

### 5. Check phase
setImmediate 의 callback 만을 위한 phase

### 6. Close callbacks
Close Event 타입 핸들러들이 여기서 처리된다.

## ■ Node.js 의 Multi threading
Node.js 의 JS 코드 실행은 싱글 스레드 이다. 하지만 비동기 I/O 작업을 libuv 에서 처리할 때는 멀티스레딩을 사용한다.   
libuv 는 기본적으로 4개의 thread 를 가지고 있다. 예를 들어 fs 모듈의 readFile() 함수나 crypto 모듈의pbkdf2() 함수를 사용하면 libuv 는 thread 를 사용해 처리한다.   
thread 는 내부에서 work queue 를 감시하는 loop 가 돌고있다.

1. 내가 index.js 에서 fs.readFile()을 사용하면 work queue에 내 요청이 담긴다.
2. libuv 의 thread가 그것을 빼내서(원래 loop를 돌면서 work queue를 감시하고 있었으니까) 실행하고 OS에게 일을 맡긴다
3. OS가 작업이 끝났다고 OS 프로세스의 버퍼에서 읽어들인 파일 Data를 가져가라고 하면 thread는 watcher queue 에 들어있는 내 read 요청에 파읽 읽기를 완료했다고 적어놓는다.
4. 위 그림의 poll 단계에서는 이 watcher queue 를 감시 하면서 변화(준비-> 완료)가 있는 요청의 콜백 함수를 호출한다.

## ■ 전체 구조
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/125668081-16f8506d-9304-4846-b8a5-f070ce70179d.png" height="600" />
  <figcaption></figcaption>
</figure>
