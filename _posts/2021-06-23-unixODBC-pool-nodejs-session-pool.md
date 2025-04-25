---
layout: post
title: Node.js 에서 pool 을 사용하면 pool size 만큼 RDBMS 에서 활용하지 않는 이유
date: 2021-06-23 22:00:00 + 0900
categories: [nodejs]
tags: [pool, unixodbc, nodejs, worker thread]
---

# Node.js 에서 unixODBC pool 을 사용할 때 pool size 만큼 RDBMS 에서 활용하지 않는 이유

### 1. 환경구성
unixODBC 에서 Pool 을 설정하고, node.js 에서 odbc module 로 pool 을 사용하는 커넥터를 개발해 RDBMS 에 연결한다. pool size 는 100 개로 설정했다.   
커넥터에 bull queue 를 사용해 쿼리 요청을 버퍼하고, bull queue 의 process 에서 concurrency 를 사용해 한 번에 pool size 만큼 RDBMS 에 요청하도록 개발했다.

### 2. 이슈
120,000 개의 insert query 를 RDBMS 커넥터에 요청하면 커넥터는 100개 씩 RDBMS 에 요청을 보내고 RDBMS 는 100 개의 세션에서 쿼리 요청을 받아 처리해야 한다.   
따라서 RDBMS 는 한 순간 최대 100 개의 세션이 ACTIVE 상태여야 하고, pool size 가 클수록 성능이 좋아져야 한다.   
하지만 RDBMS 는 최대 4개의 세션만 활용하고 1~4 사이의 pool size 에서 성능이 좋아지지만 pool size 5 부터는 성능의 이익이 없었다.   

### 3. 원인
Node.js 는 이벤트 루프의 blokcing 을 막기 위해 기본적으로 I/O 관련 작업을 멀티 스레드 구조인 OS 커널 또는 libuv 의 thread pool 에서 처리한다.   
블로킹 작업들을 OS 커널 또는 libuv 의 thread pool 에서 수행하고 완료되면 콜백 함수로 이벤트 루프에 전달한다.   
이벤트 루프의 블로킹을 모두 다른 곳으로 넘겼는데 이렇게 넘기는 것을 offloading 이라고 한다.   
커널에서 비동기를 지원하는 작업은 libuv 에서 커널의 함수를 호출해 처리하고,   
해당하지 않는 작업들은 libuv 의 thread(worker_thread)가 수행한다. 워커 스레드는 작업을 완료할 때 까지 블로킹 된다.   

![1_C5sCYUM9gPUs7ftDkqnqzg](https://user-images.githubusercontent.com/13375810/125323162-70ec1480-e379-11eb-911e-f9d9e5dc5dc0.png)

<br/>
pool 에서 세션을 가져와 쿼리 요청을 하는 Database Process 는 worker_thread 에서 진행된다.   
Node.js 의 worker_thread 기본 값이 4로 설정되어 있기 때문에 RDBMS 에서 최대로 사용하는 세션의 개수가 4개 였다.   
Node.js 실행 시 worker thread 의 사이즈를 늘려서 사용하면 RDBMS 의 세션을 pool size 만큼 사용할 수 있다.   
예를 들어 UV_THREADPOOL_SIZE 값을 최대 값인 128 로 설정해 Node.js 를 실행하고 pool size 가 100 인 경우, RDBMS 에서 세션이 최대 100개 까지 ACTIVE 상태로 동작하는 것을 확인할 수 있다.   
<br/>
Node.js oracledb 모듈의 document 에서 관련된 내용을 작성해 놓았다.    
https://oracle.github.io/node-oracledb/doc/api.html#-152-connections-threads-and-parallelism
