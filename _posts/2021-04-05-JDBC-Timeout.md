---
layout: post
title: JDBC Timeout
date: 2021-04-05 17:00:00 + 0900
categories: DB
ref: DB, JDBC
---

# JDBC Timeout
  플랫폼에서 JDBC 를 사용해 Tibero DB 에 작업을 요청한 후 동작 불능 상태가 30분 지속되고 Excpetion 이후 서비스가 복구 되었다.    
  Tibero JDBC 드라이버는 Type4 형식을 사용한다. JDBC Type4 드라이버는 Java 로 만 작성되어 있고 Java 어플리케이션에서 소켓을   
  사용해 DBMS 와 통신한다.  소켓을 통해 byte stream 을 처리하기 때문에 HttpClient 같은 네트워크 라이브러리와 비슷하게 동작하고   
  유사한 장애가 발생한다.   
    
## 1. WAS 와 DBMS 의 통신 시 타임아웃 계층
  ![FT_2021-04-05 17_23_43 580](https://user-images.githubusercontent.com/13375810/113558500-bdb5a600-963a-11eb-91f2-25dbfa3b0d44.png)
   
    
  상위 레벨의 타임아웃은 하위 레벨의 타임아웃에 의존성을 가진다. JDBC Driver SocketTimeout 이 Statement Timeout,
  Transaction Timeout 보다 우선 적용된다.
  JDBC Driver SocketTimeout 은 JDBC Connection 내부의 소켓이 타임아웃을 수행한다.   
  Statement Timeout 은 JDBC 드라이버가 구현한 Statement 가  스스로 타임아웃 처리를 수행한다. Statement 한 개의 수행 시간을 제한하는 기능만 담당한다.    
  Transaction Timeout 은 프레임워크 레벨 타임아웃이다. 프레임워크 자체 옵션으로 설정하고 프레임워크 어플리케이션 자체에서 타임아웃을 수행한다.   

## 2. TransactionTimeout 
  Spring 은 Transaction Synchronization 방식이라 하여, ThreadLocal 에 Connection 을 저장하고 Transaction 시작 시간과    
  타임아웃 시간을 같이 기록해 Proxy Connectio 을 사용해 Statement 를 생성하는 작업을 시도할 경우 경과시간을 체크해    
  예외를 발생하도록 구현되어 있다.
    
## 3. StatementTimeout
  Statement 하나가 수행 가능한 시간이다. JDBC 의 java.sql.Statement.setQueryTimeout API 로 설정한다.
     
## 4. Oracle(Tibero) JDBC Statement 의 QueryTimeout
  ![FT_2021-04-05 17_48_40 352](https://user-images.githubusercontent.com/13375810/113558566-d756ed80-963a-11eb-93b8-96a2c6f17f22.png)
    
## 5. JDBC Driver 의 SocketTimeout
  JDBC Driver 의 SocketTimeout 값은 DBMS 가 비정상 종료되거나 네트워크 장애가 발생할 때 필요한 값이다. TCP/IP 구조상 소켓에는   
  네트워크 장애를 감지할 수 있는 방법이 없어 어플리케이션은 DMBS 와 연결이 끊겼음을 알 수 없다. 이럴 때 SocketTimeout 이 설정되어   
  있지 않다면 어플리케이션은 OS Level SocketTimeout 만큼 기다리게 된다. JDBC Driver 에서 SocketTimeout 을  설정해 네트워크 장애   
  발생 시 장애 시간을 단축할 수 있다.   
  DB Connection url 의 Properties 설정 시 아래 설정값을 통해 timeout 시간을 지정할 수 있다.   
속성명 | 타입 | 설명   
---------- | ------- | -------   
login_timeout | int | 소켓의 read timeout 을 지정한다. </br>소켓을 생성할 때부터 DB 연결 생성이 완료될 때까지 적용된다. DB 연결 생성이 완료된 뒤에는 read_timeout 속성이 적용된다. 설정값이 0 인 경우 timeout 을 발생시키지 않는다.</br>(단위: ms, 기본값: 0)
read_timeout | int | DB 연결이 완료된 이후 소켓의 read timeout 을 지정한다. 설정값이 9일 경우 timeout 을 발생시키지 않는다. </br>(단위: ms, 기본값: 0)
  