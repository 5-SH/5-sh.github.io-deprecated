---
layout: post
title: Node.js 의 리액터 패턴
date: 2021-08-01 20:30:00 + 0900
categories: Patterns
ref: Nodejs, async, non-blocking, reactor-pattern
---

# Node.js 의 리액터 패턴

## 1. 블로킹 I/O
전통적인 블로킹 I/O 프로그래밍에서는 작업이 완료될 때 까지 스레드의 실행을 차단한다.   
따라서 블로킹 I/O 를 사용해 구현된 웹 서버가 같은 스레드 내에서 여러 연결을 처리하지 못하게 된다.   
보통 이 문제는 멀티스레드 사용해 해결한다.    
각각의 스레드에서 I/O 작업이 처리되기 때문에 I/O 작업으로 인해 블로킹된 스레드가 다른 연결에 영향을 미치지 않는다.   


<figure>
  <img src="https://user-images.githubusercontent.com/13375810/127773641-26c2d1b2-079f-4cea-8300-5d9ac9f87f13.png" height="250" />
  <figcaption value="▲ 다중 커넥션을 처리하기 위한 다중 스레드" />
</figure>

## 2. 논 블로킹 I/O
대부분 운영체제는 논 블로킹 I/O 를 지원한다. 시스템 호출은 데이터 읽기, 쓰기를 기다리지 않고 항상 즉시 제어권을 반환한다.   
논 블로킹 I/O 를 다루는 가장 기본적인 패턴은 주기적으로 리소스를 폴링하는 busy-waiting 방법이다.   
busy-waiting 방법의 루프는 사용할 수 없는 리소스를 반복하는데 CPU 를 사용해 낭비가 많다.

```javascript
// socketA, B, C 는 논 블로킹 I/O
const resources = [socketA, socketB, fileA];
while (!resources.isEmpty()) {
  for (resource of resources) {
    // 읽기를 시도
    data = resource.read();
    if (data === NO_DATA_AVAILABLE) {
      // 이 순간에는 읽을 데이터가 없음
      continue;
    }
    if (data === RESOURCE_CLOSED) {
      // 리소스가 닫히고 리스트에서 삭제
      resources.remove(i)
    } else {
      // 데이터를 받고 처리
      consumeData(data);
    }
  })
}
```

## 3. 이벤트 디멀티플렉싱
대부분 운영체제에서 논블로킹 리소스를 처리하기 위해 __동기 이벤트 디멀티플렉서(이벤트 통지 인터페이스)__ 를 지원한다.   
동기 이벤트 디멀티플렉서는 여러 리소스를 관찰하고 읽기 또는 쓰기 연산이 완료되었을 때 새로운 이벤트를 반환한다.   

```javascript
watchedList.add(socketA, FOR_READ); // (1)
watchList.add(fileB, FOR_READ);

while (events = demultiplexer.watch(watchedList)) { // (2)
  // 이벤트 루프
  for (event of events) { // (3)
    // 블로킹하지 않으며 항상 데이터를 반환
    data = event.resource.read();
    if (data === RESOURCE_CLOSED) {
      // 리소스가 닫히고 관찰되는 리스트에서 삭제
      demultiplexer.unwatch(event.resource);
    } else {
      // 실제 데이터를 받으면 처리
      consumeData(data);
    }
  }
}
```

1. 각 리소스가 추가된다.
2. 디멀티플렉서가 관찰될 리소스 그룹과 함께 설정된다. demultiplexer.watch() 는 동기식으로 관찰되는 리소스들 중에서 읽을 준비가 된 리소스가 있을 때까지 블로킹된다. 준비된 리소스가 생기면, 이벤트 디멀티플렉서는 처리를 위한 새로운 이벤트를 반환한다.
3. 이벤트 디멀티플렉서에서 반환된 각 이벤트가 처리된다. 이때 각 이벤트와 관련된 리소스는 처리 중 중단되지 않는다. 모든 이벤트가 처리되고 나면, 다시 이벤트 디멀티플렉서가 처리 가능한 이벤트를 반환하기 전까지 블로킹 된다. 이를 __이벤트 루프__ 라고 한다.


<figure>
  <img src="https://user-images.githubusercontent.com/13375810/127774782-13da8599-b51a-47fc-85a1-419b2f3801e8.png" height="250" />
  <figcaption value="▲ 다중 커넥션을 처리하기 위한 단일 스레드" />
</figure>

## 4. 리액터 패턴
리액터 패턴의 주된 아이디어는 각 I/O 작업에 연관된 __핸들러__ 를 갖는 것 이다.   
Node.js 에서 핸들러는 콜백 함수에 해당한다.   
핸들러는 이벤트가 생성되고 이벤트 루프에 의해 처리되는 즉시 호출되게 된다.   

![FT_2021-08-01 23_55_45 707](https://user-images.githubusercontent.com/13375810/127775479-2dbd4e6f-60a3-470a-a6a2-fa291133903c.png)

1. 어플리케이션은 이벤트 디멀티플렉서에 요청을 전달해 새로운 I/O 작업을 생성한다. 그리고 작업이 완료되었을 때 호출될 핸들러를 명시한다. 이벤트 디멀티플렉서에 새 요청을 전달하는 것은 논블로킹 호출이며, 제어권은 어플리케이션으로 즉시 반환된다.
2. I/O 작업들이 완료되면 이벤트 디멀티플렉서는 대응하는 이벤트 작업들을 이벤트 큐에 추가한다.
3. 이벤트 루프가 이벤트 큐의 항목을 순환한다.
4. 각 이벤트와 관련된 핸들러가 호출된다.
5. 핸들러의 실행이 완료되면 제어권을 이벤트 루프에 되돌려준다(5a). 핸들러 실행 중에 다른 비동기 작업을 요청할 수 있고(5b), 이는 이벤트 디멀티플렉서에 새로운 요청을 추가하는 것이다.
6. 이벤트 큐의 모든 항목이 처리되고 나면 이벤트 루프는 이벤트 디멀티플렉서에서 블로킹되며 처리 가능한 새 이벤트가 있을 경우 이 과정이 다시 시작된다.

## 5. Node.js 의 I/O 엔진 libuv 
각 운영체제는 Linux-epoll, Window-IOCP API 와 같은 이벤트 디멀티플렉서를 위한 자체 인터페이스를 가지고 있다.   
그리고 각 I/O 작업은 동일한 OS 내에서도 리소스 유형에 따라 매우 다르게 동작할 수 있다.   
   
UNIX 에서 일반 파일 시스템은 논 블로킹 작업을 지원하지 않기 때문에 이벤트 루프 외부에 별도의 스레드를 사용해야 한다.   
운영체제 간의 불일치성을 해결하고 서로 다른 리소스 유형의 논 블로킹 동작을 표준화 하기 위해 libuv 라는 라이브러리를 만들었다.   
libuv 는 운영체제의 기본 시스템 호출을 추상화 하고 리액터 패턴을 구현해 이벤트 루프의 생성, 이벤트 큐의 관리, 비동기 I/O 작업의 실행 및 다른 유형의 작업을 큐에 담기 위핸 API 들을 제공한다.
