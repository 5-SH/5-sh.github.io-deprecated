---
layout: post
title: unixODBC 에서 pool 사용법과 Node.js 에서 pool 을 사용하면 pool size 만큼 DBMS 에서 활용하지 않는 이유
date: 2021-06-18 22:00:00 + 0900
categories: Nodejs
ref: pool, unixodbc, Nodejs, worker thread
---

# unixODBC 에서 pool 사용법과 Node.js 에서 pool 을 사용하면 pool size 만큼 DBMS 에서 활용하지 않는 이유

- unixODBC 의 pool 은 scale in 이 되지 않는다.   
- pool 을 사용하기 위한 odbc.ini, odbcinst.ini 설정법
- node.js 에서 node-odbc 를 활용해 pool 을 100개 만들어도 dbms 에서 100 개 모두 사용하지 않는다. 
- 딱, 4개만 사용하는데 그 이유는, node.js 의 기본 worker thread 개수가 4개 때문
- RDBMS 의 ODBC 드라이버는 멀테스레드 구조라 pool 에 쿼리 요청을 스레드를 통해 배분하는 것 같다.
- UV_THREADPOOL_SIZE 옵션으로 worker thread 를 늘리면 worker thread 크기 만큼 DBMS 에서 pool 을 활용한다.

