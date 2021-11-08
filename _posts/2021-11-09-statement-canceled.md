---
layout: post
title: Statement canceled 에러의 원인과 해결
date: 2021-11-09 23:00:00 + 0900
categories: DB
ref: DB, JDBC, 12040, Statement
---

# Statement canceled 에러의 원인과 해결

## Statement Timeout

티베로 서버를 JDBC 로 연결해 사용하던 중 JDBC-12040:Statement canceled 에러가 발생했다.   

이 에러는 statement timeout 에 의해 발생하는 에러이다.

statement timeout 은 statement 하나가 얼마나 오래 수행되어도 괜찮은지에 대한 한계값이고 JDBC API 인 Statement 에서 설정할 수 있다.

티베로와 비슷한 오라클의 statement timeout 처리는 다음과 같다.

<figure>

  <img src="https://user-images.githubusercontent.com/13375810/140767046-dd4b6b74-4632-41b0-adf0-44efa136131f.png" height=450/>

 <figcaption>출처 - https://d2.naver.com/helloworld/1321</figcaption>

</figure>

- Connection.createStatement() 메서드를 호출하여 Statement를 생성한다.
- Statement.executeQuery() 메서드를 호출한다.
- Statement는 자신의 Connection을 사용하여 Oracle DBMS로 쿼리를 전송한다.
- Statement는 타임아웃 처리를 위해 OracleTimeoutPollingThread(classloader별로 1개 존재)에 Statement를 등록한다.
- 타임아웃이 발생한다.
- OracleTimeoutPollingThread는 OracleStatement.cancel() 메서드를 호출한다.
- Connection을 통해 취소(cancel) 메시지를 전송하여 수행중인 쿼리를 취소한다

따라서 JDBC statement 를 요청한 곳에서 statement canceled 에러를 받게 된다.

<br />

## Lock

statement timeout 은 보통 잠금에 의한 쿼리 수행 지연이다. 

조회하려는 테이블의 row 에 잠금이 되어 있어  읽기, 쓰기가 지연되고 statement timeout 이 넘어갈 때 까지 쿼리가 완료되지 않아 취소된다.

<br />

잠금의 범위로 테이블락, 페이지락 등이 있지만 티베로는 기본적으로 row level lock 을 사용한다.

<figure>
    <img src="https://user-images.githubusercontent.com/13375810/140769803-424a8d93-f6f0-4ac3-9b3d-870da7086705.jpg" />

 <figcaption></figcaption>

</figure>

그리고 잠금의 종류와 잠금 관계는 다음과 같다.

<figure>
    <img src="https://user-images.githubusercontent.com/13375810/140768651-49d7a481-af62-490b-a6ab-b06182090e7f.jpg" />


 <figcaption></figcaption>

</figure>

<br />

## 결론

JDBC API 를 통해 요청한 Statement 가 설정한 statement timeout 시간 안에 완료되지 않은 이유는 잠금 때문이었다.

요청한 Statement 는 타겟 테이블에 update 를 주로 요청했는데, 같은 테이블을 대상으로 주기적으로 동작하는 프로시저에 의해

update 하려는 row 의 잠금을 얻지 못해 발생한 문제였다.
